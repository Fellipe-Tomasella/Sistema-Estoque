import nodemailer from 'nodemailer'
import { env } from '../config/env'

export interface MailMessage {
  to: string
  subject: string
  text: string
  /** Versão bonita; o texto continua como alternativa para leitores sem HTML. */
  html?: string
  /** Nome que aparece como remetente (o endereço continua o do SMTP_FROM). */
  fromName?: string
  replyTo?: string
}

/** “Nome <email>” com outro nome, mantendo o endereço autorizado no SMTP. */
export function withFromName(from: string | undefined, name: string | undefined) {
  if (!from || !name) return from
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim()
  return `"${name.replace(/"/g, '')}" <${address}>`
}

export interface Mailer {
  /** false quando não há SMTP configurado: a recuperação de senha fica só pelo script do servidor. */
  readonly enabled: boolean
  send(message: MailMessage): Promise<void>
}

export class SmtpMailer implements Mailer {
  readonly enabled = true
  private readonly transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  })

  async send(message: MailMessage): Promise<void> {
    const { fromName, ...rest } = message
    await this.transport.sendMail({ ...rest, from: withFromName(env.smtp.from, fromName) })
  }
}

export class DisabledMailer implements Mailer {
  readonly enabled = false
  async send(): Promise<void> {}
}

/** Usado nos testes: guarda as mensagens em vez de enviar. */
export class MemoryMailer implements Mailer {
  readonly enabled = true
  readonly outbox: MailMessage[] = []
  async send(message: MailMessage): Promise<void> {
    this.outbox.push(message)
  }
}

export function createMailer(): Mailer {
  if (env.isTest) return new MemoryMailer()
  return env.smtp.host ? new SmtpMailer() : new DisabledMailer()
}
