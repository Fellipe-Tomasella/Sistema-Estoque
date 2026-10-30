import type { DiscountKind } from '@estoque/shared'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useDebounceFn } from '@vueuse/core'
import { computed, reactive, ref, type Ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ApiError, client, unwrap } from '@/lib/api'
import { invalidateStock, keys, queryClient } from '@/lib/query'

export type SaleView = NonNullable<Awaited<ReturnType<ReturnType<typeof client.sales>['get']>>['data']>
type UpdateBody = Parameters<ReturnType<typeof client.sales>['patch']>[0]
type DraftPayment = NonNullable<UpdateBody['payments']>[number]
type Address = NonNullable<NonNullable<UpdateBody['shipping']>['address']>

export interface CartItem {
  variantId: string
  productName: string
  variantLabel: string
  unitPriceCents: number
  quantity: number
  availableQty: number
}

/** O que a dona edita no PDV. Os totais, avisos e bloqueios vêm do servidor (fonte da verdade). */
export interface DraftState {
  items: CartItem[]
  customerId: string | null
  discount: { kind: DiscountKind; value: number }
  payments: DraftPayment[]
  fiado: boolean
  fiadoDueDate: string | null
  shipping: { enabled: boolean; address: Address | null; uf: string | null; trackingCode: string | null }
  notes: string | null
}

const emptyState = (): DraftState => ({
  items: [],
  customerId: null,
  discount: { kind: 'none', value: 0 },
  payments: [],
  fiado: false,
  fiadoDueDate: null,
  shipping: { enabled: false, address: null, uf: null, trackingCode: null },
  notes: null,
})

function fromView(view: SaleView): DraftState {
  return {
    items: view.items.map((i) => ({
      variantId: i.variantId,
      productName: i.productName,
      variantLabel: i.variantLabel,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      availableQty: i.availableQty ?? 0,
    })),
    customerId: view.customerId,
    discount: { kind: view.discount.kind, value: view.discount.value },
    payments: view.payments
      .filter((p) => p.method !== 'exchange_credit')
      .map((p) => ({
        id: p.id,
        method: p.method as DraftPayment['method'],
        amountCents: p.amountCents,
        confirmed: 'confirmed' in p ? Boolean(p.confirmed) : true,
        cardType: p.cardType ?? null,
        installments: p.installments ?? null,
        cashGivenCents: 'cashGivenCents' in p ? (p.cashGivenCents ?? null) : null,
      })),
    fiado: view.fiado.enabled,
    fiadoDueDate: view.fiado.dueDate,
    shipping: {
      enabled: view.shipping.status !== 'none',
      address: view.shipping.address,
      uf: view.shipping.uf,
      trackingCode: view.shipping.trackingCode,
    },
    notes: view.notes,
  }
}

/**
 * Rascunho do PDV salvo no servidor a cada alteração (debounce 500 ms) com `version` (RN-VEN-01/10):
 * aparece no notebook e no celular; se outro aparelho mexeu antes, avisa e recarrega.
 */
export function useSaleDraft(id: Ref<string>) {
  const state = reactive<DraftState>(emptyState())
  const version = ref(0)
  const saving = ref(false)
  const pending = ref(false)
  let editsSinceSave = 0

  const query = useQuery({
    queryKey: computed(() => keys.sale(id.value)),
    queryFn: () => unwrap(client.sales({ id: id.value }).get()),
    // Recarregar ao voltar para a aba atrapalharia a digitação; conflito entre aparelhos é tratado no 409.
    refetchOnWindowFocus: false,
  })
  const view = ref<SaleView | null>(null)

  watch(
    query.data,
    (data) => {
      if (!data) return
      view.value = data
      // Mesma versão = é o retorno do nosso próprio salvamento: não sobrescreve o que está sendo digitado.
      if (data.status !== 'draft' || data.version === version.value) return
      version.value = data.version
      Object.assign(state, fromView(data))
    },
    { immediate: true },
  )

  async function save() {
    if (saving.value) return void (pending.value = true)
    saving.value = true
    pending.value = false
    const sentEdits = editsSinceSave
    try {
      const body: UpdateBody = {
        version: version.value,
        items: state.items.map(({ variantId, quantity }) => ({ variantId, quantity })),
        customerId: state.customerId,
        discount: state.discount,
        payments: state.payments,
        fiado: state.fiado,
        fiadoDueDate: state.fiadoDueDate,
        shipping: state.shipping,
        notes: state.notes,
      }
      const result = await unwrap(client.sales({ id: id.value }).patch(body))
      version.value = result.version
      view.value = result
      queryClient.setQueryData(keys.sale(id.value), result)
      // Atualiza saldo/preço dos itens sem desfazer o que foi editado enquanto salvava.
      if (editsSinceSave === sentEdits) {
        for (const item of state.items) {
          const fresh = result.items.find((i) => i.variantId === item.variantId)
          if (fresh)
            Object.assign(item, { unitPriceCents: fresh.unitPriceCents, availableQty: fresh.availableQty ?? 0 })
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message)
        await query.refetch()
      } else {
        toast.error((error as Error).message)
      }
    } finally {
      saving.value = false
      if (pending.value) save()
    }
  }
  const debouncedSave = useDebounceFn(save, 500)

  /** Toda edição passa por aqui: marca como pendente e agenda o salvamento. */
  function change(mutator: (state: DraftState) => void) {
    mutator(state)
    editsSinceSave++
    pending.value = true
    debouncedSave()
  }

  const confirm = useMutation({
    mutationFn: async () => {
      if (pending.value || saving.value) await save()
      return unwrap(client.sales({ id: id.value }).confirm.post())
    },
    onSuccess: async (sale) => {
      view.value = sale
      queryClient.setQueryData(keys.sale(id.value), sale)
      await Promise.all([invalidateStock(), queryClient.invalidateQueries({ queryKey: ['sales'] })])
    },
  })

  return { state, view, query, saving, pending, change, save, confirm }
}

/** Lista de rascunhos e criação/descartar (RN-VEN-09). */
export function useDrafts() {
  const drafts = useQuery({ queryKey: ['sales', 'drafts'], queryFn: () => unwrap(client.sales.drafts.get()) })
  const create = useMutation({ mutationFn: () => unwrap(client.sales.post()) })
  const discard = useMutation({
    mutationFn: (id: string) => unwrap(client.sales({ id }).delete()),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales', 'drafts'] }),
        queryClient.invalidateQueries({ queryKey: keys.dashboard }),
      ]),
  })
  return { drafts, create, discard }
}
