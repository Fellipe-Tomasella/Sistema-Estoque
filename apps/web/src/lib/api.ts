// Cliente HTTP tipado: os tipos de rotas, corpos e respostas vêm direto da API (Eden Treaty).
import type { App } from '@estoque/api'
import { treaty } from '@elysiajs/eden'

/**
 * Mesma origem (em dev, o Vite repassa /api para a API): o cookie de sessão vai sozinho.
 * `parseDate: false`: o Eden transformaria "2026-10-30" em meia-noite UTC — que é dia 29 no fuso da loja.
 * Datas chegam como texto e `lib/format` interpreta (dia da loja ou instante).
 */
export const client = treaty<App>(window.location.origin, {
  fetch: { credentials: 'include' },
  parseDate: false,
}).api

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
  }
}

type EdenResult<T> = { data: T; error: null } | { data: null; error: { status: unknown; value: unknown } }

/** Desembrulha a resposta do Eden: devolve os dados ou lança `ApiError` com a mensagem pt-BR da API. */
export async function unwrap<T>(request: Promise<EdenResult<T>>): Promise<Exclude<T, null>> {
  let result: EdenResult<T>
  try {
    result = await request
  } catch {
    throw new ApiError(0, 'NETWORK', 'Sem internet. Nada foi salvo. Tente de novo quando a conexão voltar.')
  }
  if (result.error) {
    const status = Number(result.error.status) || 0
    const body = result.error.value as { error?: { code: string; message: string; details?: Record<string, unknown> } }
    throw new ApiError(
      status,
      body?.error?.code ?? 'INTERNAL',
      body?.error?.message ?? 'Erro inesperado no servidor. Tente de novo em instantes.',
      body?.error?.details,
    )
  }
  return result.data as Exclude<T, null>
}

/** Chave de idempotência gerada ao abrir um formulário (entradas, acertos, recebimentos, devoluções). */
export const newIdempotencyKey = () => crypto.randomUUID()
