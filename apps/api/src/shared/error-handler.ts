import { ErrorCode } from '@estoque/shared'
import { Elysia } from 'elysia'
import { AppError } from './errors'

function body(code: string, message: string, details?: Record<string, unknown>) {
  return { error: { code, message, ...(details ? { details } : {}) } }
}

/** Converte qualquer erro no formato único da API, sempre com mensagem em pt-BR. */
export const errorHandler = new Elysia({ name: 'error-handler' }).onError({ as: 'global' }, ({ error, code, set }) => {
  if (error instanceof AppError) {
    set.status = error.status
    return body(error.code, error.message, error.details)
  }

  switch (code) {
    case 'VALIDATION':
      set.status = 400
      return body(ErrorCode.VALIDATION, 'Dados inválidos. Confira os campos e tente de novo.', {
        fields: error.all.map((issue) => ({ path: 'path' in issue ? issue.path : '', message: issue.summary })),
      })
    case 'PARSE':
      set.status = 400
      return body(ErrorCode.VALIDATION, 'Não foi possível ler os dados enviados.')
    case 'NOT_FOUND':
      set.status = 404
      return body(ErrorCode.NOT_FOUND, 'Rota não encontrada.')
    default:
      console.error(error)
      set.status = 500
      return body(ErrorCode.INTERNAL, 'Erro inesperado no servidor. Tente de novo em instantes.')
  }
})
