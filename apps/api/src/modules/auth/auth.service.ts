import { db } from '../../db/client'
import type { Session, User } from '../../db/schema'
import { ConflictError, TooManyAttemptsError, UnauthorizedError, ValidationError } from '../../shared/errors'
import type { Mailer } from '../../shared/mailer'
import { RateLimiter } from '../../shared/rate-limiter'
import { generateToken, hashToken } from '../../shared/tokens'
import type { AuditService } from '../audit/audit.service'
import type { AuthRepository } from './auth.repository'
import { MIN_PASSWORD_LENGTH, type PublicUser } from './auth.schemas'

const MINUTE = 60_000
const SESSION_TTL_MS = 30 * 24 * 60 * MINUTE // 30 dias sem uso
const SESSION_TOUCH_INTERVAL_MS = 60 * MINUTE // renova no máximo 1×/hora para não gravar a cada requisição
const RESET_TTL_MS = 60 * MINUTE

export interface ClientInfo {
  ip?: string | null
  userAgent?: string | null
}

export interface AuthenticatedSession {
  user: PublicUser
  session: Session
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export class AuthService {
  readonly sessionTtlSeconds = SESSION_TTL_MS / 1000
  private readonly loginLimiter = new RateLimiter(5, 15 * MINUTE)

  constructor(
    private readonly repo: AuthRepository,
    private readonly audit: AuditService,
    private readonly mailer: Mailer,
    private readonly appOrigin: string,
  ) {}

  /** Usado pelo script `create-user` (não há cadastro público). */
  async createUser(input: { name: string; email: string; password: string }): Promise<PublicUser> {
    const email = normalizeEmail(input.email)
    this.assertPassword(input.password)
    if (await this.repo.findUserByEmail(email)) throw new ConflictError('Já existe uma conta com este e-mail.')
    const user = await this.repo.insertUser({
      name: input.name.trim(),
      email,
      passwordHash: await Bun.password.hash(input.password),
    })
    return toPublicUser(user)
  }

  /**
   * Primeira conta vinda do deploy (variáveis FIRST_USER_*): só é criada com o banco sem nenhuma conta,
   * então trocar a senha depois pelo sistema não é desfeito no próximo restart.
   */
  async ensureFirstUser(input: { name?: string; email?: string; password?: string }): Promise<PublicUser | null> {
    if (!input.name || !input.email || !input.password) return null
    if (await this.repo.hasUsers()) return null
    return this.createUser({ name: input.name, email: input.email, password: input.password })
  }

  async login(input: { email: string; password: string }, client: ClientInfo) {
    const email = normalizeEmail(input.email)
    const limiterKey = `${client.ip ?? '?'}|${email}`
    if (this.loginLimiter.isBlocked(limiterKey)) {
      throw new TooManyAttemptsError('Muitas tentativas de login. Aguarde 15 minutos e tente de novo.')
    }

    const user = await this.repo.findUserByEmail(email)
    const valid = user ? await Bun.password.verify(input.password, user.passwordHash) : false
    if (!user || !valid) {
      this.loginLimiter.hit(limiterKey)
      throw new UnauthorizedError('E-mail ou senha incorretos.')
    }

    this.loginLimiter.reset(limiterKey)
    const token = await this.startSession(user.id, client)
    await this.audit.record({ entity: 'user', entityId: user.id, action: 'login', after: client, userId: user.id })
    return { user: toPublicUser(user), token }
  }

  /** Valida o token do cookie; renova a validade (expiração deslizante). */
  async authenticate(token: string | undefined): Promise<AuthenticatedSession | null> {
    if (!token) return null
    const found = await this.repo.findSessionWithUser(hashToken(token))
    if (!found) return null

    const now = new Date()
    if (found.session.expiresAt <= now) {
      await this.repo.deleteSession(found.session.id)
      return null
    }
    if (now.getTime() - found.session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
      await this.repo.touchSession(found.session.id, now, new Date(now.getTime() + SESSION_TTL_MS))
    }
    return { user: toPublicUser(found.user), session: found.session }
  }

  logout(sessionId: string): Promise<void> {
    return this.repo.deleteSession(sessionId)
  }

  /** “Sair de todos os aparelhos” (RN-ACE-03). */
  logoutAll(userId: string): Promise<void> {
    return this.repo.deleteUserSessions(userId)
  }

  /** Sempre termina sem erro, para não revelar se o e-mail existe. */
  async requestPasswordReset(rawEmail: string): Promise<void> {
    if (!this.mailer.enabled) return
    const user = await this.repo.findUserByEmail(normalizeEmail(rawEmail))
    if (!user) return

    const token = generateToken()
    await this.repo.insertPasswordReset({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    })
    await this.mailer.send({
      to: user.email,
      subject: 'Redefinir senha do sistema de estoque',
      text:
        `Olá, ${user.name}.\n\nPara criar uma nova senha, abra o link abaixo (vale por 1 hora):\n` +
        `${this.appOrigin}/redefinir-senha?token=${token}\n\nSe você não pediu, ignore este e-mail.`,
    })
  }

  /** Troca a senha pelo link do e-mail; derruba todas as sessões abertas. */
  async resetPassword(token: string, password: string): Promise<void> {
    this.assertPassword(password)
    const passwordHash = await Bun.password.hash(password)
    await db.transaction(async (tx) => {
      const now = new Date()
      const reset = await this.repo.findUsableReset(hashToken(token), now, tx)
      if (!reset) throw new ValidationError('Link inválido ou expirado. Peça uma nova redefinição de senha.')
      await this.repo.updatePassword(reset.userId, passwordHash, tx)
      await this.repo.markResetUsed(reset.id, now, tx)
      await this.repo.deleteUserSessions(reset.userId, undefined, tx)
      await this.audit.record(
        { entity: 'user', entityId: reset.userId, action: 'password_reset', userId: reset.userId },
        tx,
      )
    })
  }

  /** Troca a senha estando logada; mantém só a sessão atual. */
  async changePassword(auth: AuthenticatedSession, current: string, next: string): Promise<void> {
    this.assertPassword(next)
    const user = await this.repo.findUserByEmail(auth.user.email)
    if (!user || !(await Bun.password.verify(current, user.passwordHash))) {
      throw new ValidationError('A senha atual está incorreta.', { field: 'current' })
    }
    const passwordHash = await Bun.password.hash(next)
    await db.transaction(async (tx) => {
      await this.repo.updatePassword(user.id, passwordHash, tx)
      await this.repo.deleteUserSessions(user.id, auth.session.id, tx)
      await this.audit.record({ entity: 'user', entityId: user.id, action: 'password_change', userId: user.id }, tx)
    })
  }

  /** Recuperação pelo servidor (script `reset-password`), quando não há SMTP. */
  async setPasswordByEmail(rawEmail: string, password: string): Promise<void> {
    this.assertPassword(password)
    const user = await this.repo.findUserByEmail(normalizeEmail(rawEmail))
    if (!user) throw new ValidationError('Nenhuma conta com este e-mail.')
    const passwordHash = await Bun.password.hash(password)
    await db.transaction(async (tx) => {
      await this.repo.updatePassword(user.id, passwordHash, tx)
      await this.repo.deleteUserSessions(user.id, undefined, tx)
      await this.audit.record({ entity: 'user', entityId: user.id, action: 'password_reset_script', userId: null }, tx)
    })
  }

  private async startSession(userId: string, client: ClientInfo): Promise<string> {
    const token = generateToken()
    await this.repo.insertSession({
      userId,
      tokenHash: hashToken(token),
      ip: client.ip ?? null,
      userAgent: client.userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    })
    return token
  }

  private assertPassword(password: string) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
    }
  }
}
