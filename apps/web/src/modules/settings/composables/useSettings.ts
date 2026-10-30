import { useMutation, useQuery } from '@tanstack/vue-query'
import { client, unwrap } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'

export type StoreSettingsBody = Parameters<typeof client.settings.store.put>[0]

/** Configurações da loja. O fuso muda a data das vendas e o fechamento: atualiza tudo depois de salvar. */
export function useStoreSettings() {
  const query = useQuery({ queryKey: keys.settings, queryFn: () => unwrap(client.settings.store.get()) })
  const save = useMutation({
    mutationFn: (body: StoreSettingsBody) => unwrap(client.settings.store.put(body)),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.settings, data)
      return Promise.all(
        [keys.dashboard, keys.reports, keys.pending].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
    },
  })
  return { ...query, save }
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { current: string; next: string }) => unwrap(client.auth['change-password'].post(body)),
  })
}

/** Fusos do Brasil (o padrão da loja é America/Sao_Paulo). */
export const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (SP, RJ, MG, Sul, NE…)' },
  { value: 'America/Cuiaba', label: 'Mato Grosso (MT, MS)' },
  { value: 'America/Manaus', label: 'Amazonas, RO, RR' },
  { value: 'America/Rio_Branco', label: 'Acre' },
  { value: 'America/Belem', label: 'Pará, Amapá' },
  { value: 'America/Noronha', label: 'Fernando de Noronha' },
]
