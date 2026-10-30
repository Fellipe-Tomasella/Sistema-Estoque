import { QueryClient } from '@tanstack/vue-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
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

/** Chaves padronizadas: invalidar `['sales']` atualiza todas as telas de vendas. */
export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  settings: ['settings'] as const,
  products: (filters?: object) => ['products', filters ?? {}] as const,
  product: (id: string) => ['products', id] as const,
  stock: ['stock'] as const,
  customers: (filters?: object) => ['customers', filters ?? {}] as const,
  customer: (id: string) => ['customers', id] as const,
  sales: (filters?: object) => ['sales', filters ?? {}] as const,
  sale: (id: string) => ['sales', id] as const,
  receivables: ['receivables'] as const,
  reports: ['reports'] as const,
  pending: ['pending'] as const,
}
