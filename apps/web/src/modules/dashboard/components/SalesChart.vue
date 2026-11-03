<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatBRL, formatDate } from '@/lib/format'

/**
 * Vendas confirmadas por dia (uma série só: o título diz o que é, sem legenda).
 * Barras finas na cor da marca, topo arredondado, grade discreta e tooltip ao passar o mouse ou tocar.
 */
const props = defineProps<{ days: { date: string; count: number; totalCents: number }[] }>()

const W = 640
const H = 180
const PAD = { top: 12, right: 8, bottom: 22, left: 8 }
const plotH = H - PAD.top - PAD.bottom
const slot = computed(() => (W - PAD.left - PAD.right) / Math.max(props.days.length, 1))
const barW = computed(() => Math.min(28, slot.value - 4))
const max = computed(() => Math.max(...props.days.map((d) => d.totalCents), 1))
const total = computed(() => props.days.reduce((sum, d) => sum + d.totalCents, 0))
const salesCount = computed(() => props.days.reduce((sum, d) => sum + d.count, 0))

const bars = computed(() =>
  props.days.map((d, i) => {
    const h = d.totalCents ? Math.max(3, (d.totalCents / max.value) * plotH) : 0
    const x = PAD.left + i * slot.value + (slot.value - barW.value) / 2
    return { ...d, x, y: PAD.top + plotH - h, h, cx: x + barW.value / 2 }
  }),
)
const weekday = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')

const active = ref<number | null>(null)
const tip = computed(() => (active.value === null ? null : bars.value[active.value]))
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <p class="font-semibold">Vendas dos últimos 14 dias</p>
      <p class="text-sm text-muted-foreground">
        {{ salesCount }} {{ salesCount === 1 ? 'venda' : 'vendas' }} ·
        <span class="font-medium text-foreground">{{ formatBRL(total) }}</span>
      </p>
    </div>

    <div class="relative mt-3" @mouseleave="active = null">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        class="h-44 w-full"
        role="img"
        :aria-label="`Vendas por dia: total ${formatBRL(total)}`"
      >
        <line
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="PAD.top + plotH"
          :y2="PAD.top + plotH"
          class="stroke-border"
          stroke-width="1"
        />
        <line
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="PAD.top + plotH / 2"
          :y2="PAD.top + plotH / 2"
          class="stroke-border"
          stroke-dasharray="3 4"
          stroke-width="1"
        />
        <g v-for="(bar, i) in bars" :key="bar.date">
          <!-- alvo de toque maior que a barra -->
          <rect
            :x="PAD.left + i * slot"
            :y="PAD.top"
            :width="slot"
            :height="plotH"
            fill="transparent"
            @mouseenter="active = i"
            @click="active = active === i ? null : i"
          >
            <title>{{ formatDate(bar.date) }}: {{ formatBRL(bar.totalCents) }}</title>
          </rect>
          <path
            v-if="bar.h"
            :d="`M${bar.x},${bar.y + bar.h} V${bar.y + Math.min(4, bar.h)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${bar.y + bar.h} Z`"
            :class="active === null || active === i ? 'fill-brand' : 'fill-brand/40'"
            class="pointer-events-none transition-colors"
          />
          <text
            v-if="i % 2 === bars.length % 2 || bars.length <= 7"
            :x="bar.cx"
            :y="H - 6"
            text-anchor="middle"
            class="fill-muted-foreground text-[10px]"
          >
            {{ weekday(bar.date) }}
          </text>
        </g>
      </svg>

      <div
        v-if="tip"
        class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
        :style="{ left: `${(tip.cx / W) * 100}%` }"
      >
        <p class="font-medium">{{ formatDate(tip.date) }}</p>
        <p class="text-muted-foreground">
          {{ tip.count }} {{ tip.count === 1 ? 'venda' : 'vendas' }} ·
          <span class="font-medium text-foreground">{{ formatBRL(tip.totalCents) }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
