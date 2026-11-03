// Lê e valida as variáveis de ambiente uma única vez. Falha cedo, com mensagem clara, se faltar algo.

const nodeEnv = process.env.NODE_ENV ?? 'development'
const isTest = nodeEnv === 'test'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente ${name} não definida (veja .env.example).`)
  return value
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined
}

export const env = {
  nodeEnv,
  isTest,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 3000),
  /** Pasta do build do front (produção). Sem ela, só a API sobe. */
  publicDir: optional('PUBLIC_DIR'),
  /** Primeira conta (só com o banco vazio) — ver AuthService.ensureFirstUser. */
  firstUser: {
    name: optional('FIRST_USER_NAME'),
    email: optional('FIRST_USER_EMAIL'),
    password: optional('FIRST_USER_PASSWORD'),
  },
  /** Cabeçalho com o IP real de quem acessa, preenchido pelo proxy. */
  clientIpHeader: (optional('CLIENT_IP_HEADER') ?? 'x-real-ip').toLowerCase(),
  appOrigin: required('APP_ORIGIN'),
  databaseUrl: isTest ? required('DATABASE_URL_TEST') : required('DATABASE_URL'),
  sessionSecret: required('SESSION_SECRET'),
  smtp: {
    host: optional('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT ?? 587),
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
    from: optional('SMTP_FROM'),
  },
} as const
