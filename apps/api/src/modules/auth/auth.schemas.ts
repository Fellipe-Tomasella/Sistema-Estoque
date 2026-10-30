import { t } from 'elysia'

export const MIN_PASSWORD_LENGTH = 8

const Email = t.String({ format: 'email', maxLength: 200 })
const Password = t.String({ minLength: MIN_PASSWORD_LENGTH, maxLength: 200 })

export const LoginBody = t.Object({ email: Email, password: t.String({ minLength: 1, maxLength: 200 }) })
export const ForgotPasswordBody = t.Object({ email: Email })
export const ResetPasswordBody = t.Object({ token: t.String({ minLength: 1 }), password: Password })
export const ChangePasswordBody = t.Object({ current: t.String({ minLength: 1 }), next: Password })

export const PublicUser = t.Object({ id: t.String(), name: t.String(), email: t.String() })
export type PublicUser = typeof PublicUser.static
