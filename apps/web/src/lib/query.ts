import { MutationCache, QueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  // Toda gravação que falha mostra a mensagem da API (já em pt-BR); a tela não precisa tratar caso a caso.
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.options.meta?.silent) toast.error(error.message)
    },
  }),
  defaultOptions: {
    queries: {
      // Notebook e celular se mantêm em dia ao voltar para a janela (02 §3.8).
      refetchOnWindowFocus: true,
      staleTime: 15_000,
      // Erro de regra/validação não melhora tentando de novo.
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
})

/** Chaves padronizadas: invalidar `['products']` atualiza todas as telas de produtos. */
export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  settings: ['settings'] as const,
  products: (filters?: object) => ['products', filters ?? {}] as const,
  product: (id: string) => ['products', 'detail', id] as const,
  suggestions: ['products', 'suggestions'] as const,
  stock: ['stock'] as const,
  customers: (filters?: object) => ['customers', filters ?? {}] as const,
  customer: (id: string) => ['customers', 'detail', id] as const,
  sales: (filters?: object) => ['sales', filters ?? {}] as const,
  sale: (id: string) => ['sales', 'detail', id] as const,
  receivables: ['receivables'] as const,
  reports: ['reports'] as const,
  pending: ['pending'] as const,
}

/** Depois de mexer em estoque, tudo que mostra saldo precisa atualizar. */
export function invalidateStock() {
  return Promise.all(
    [['products'], ['variant'], keys.stock, keys.dashboard, ['search']].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  )
}

declare module '@tanstack/vue-query' {
  interface Register {
    mutationMeta: { silent?: boolean }
  }
}
