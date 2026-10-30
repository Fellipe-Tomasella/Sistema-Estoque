import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { client, unwrap } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'

type ListQuery = NonNullable<Parameters<typeof client.customers.get>[0]>['query']
type CreateBody = Parameters<typeof client.customers.post>[0]
type UpdateBody = Parameters<ReturnType<typeof client.customers>['patch']>[0]

export type CustomerPage = NonNullable<Awaited<ReturnType<typeof client.customers.get>>['data']>
export type Customer = CustomerPage['items'][number]

const refreshCustomers = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customers'] }),
    queryClient.invalidateQueries({ queryKey: ['search'] }),
  ])

export function useCustomerList(filters: MaybeRefOrGetter<ListQuery>) {
  return useQuery({
    queryKey: computed(() => keys.customers(toValue(filters))),
    queryFn: () => unwrap(client.customers.get({ query: toValue(filters) })),
    placeholderData: (previous) => previous,
  })
}

export function useCustomer(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.customer(toValue(id))),
    queryFn: () => unwrap(client.customers({ id: toValue(id) }).get()),
    enabled: computed(() => Boolean(toValue(id))),
  })
}

/** Dívidas da cliente com recebimentos e ajustes (RN-FIA-02). */
export function useCustomerReceivables(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => [...keys.receivables, toValue(id)]),
    queryFn: () => unwrap(client.customers({ id: toValue(id) }).receivables.get()),
    enabled: computed(() => Boolean(toValue(id))),
  })
}

export function useCustomerMutations() {
  return {
    create: useMutation({
      mutationFn: (body: CreateBody) => unwrap(client.customers.post(body)),
      onSuccess: refreshCustomers,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateBody }) => unwrap(client.customers({ id }).patch(body)),
      onSuccess: refreshCustomers,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        unwrap(active ? client.customers({ id }).activate.post() : client.customers({ id }).deactivate.post()),
      onSuccess: refreshCustomers,
    }),
  }
}

/** “MS” para Maria Souza: o avatar do modelo, sem foto. */
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
