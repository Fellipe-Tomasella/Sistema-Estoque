import { ErrorCode } from '@estoque/shared'

/** Erro de aplicação: vira `{ error: { code, message, details } }` com o status HTTP correspondente. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, ErrorCode.VALIDATION, message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Faça login para continuar.') {
    super(401, ErrorCode.UNAUTHORIZED, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso não permitido.') {
    super(403, ErrorCode.FORBIDDEN, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Registro não encontrado.') {
    super(404, ErrorCode.NOT_FOUND, message)
  }
}

/** Conflito de estado (ex.: rascunho alterado em outro aparelho). */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, ErrorCode.CONFLICT, message, details)
  }
}

/** Regra de negócio violada. `code` específico (ex.: INSUFFICIENT_STOCK) ajuda o front a reagir. */
export class BusinessRuleError extends AppError {
  constructor(message: string, code: string = ErrorCode.BUSINESS_RULE, details?: Record<string, unknown>) {
    super(422, code, message, details)
  }
}
