// Itens do menu: uma fonte só para a barra lateral (desktop), a barra inferior e o “Mais” (celular).
import {
  BarChart3,
  BellRing,
  House,
  type LucideIcon,
  Package,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from '@lucide/vue'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Rotas que também deixam o item marcado como ativo. */
  match: string[]
  badge?: 'pending'
}

export const navItems: NavItem[] = [
  { label: 'Início', to: '/', icon: House, match: [] },
  { label: 'PDV', to: '/pdv', icon: ShoppingBag, match: ['/pdv'] },
  { label: 'Produtos e estoque', to: '/produtos', icon: Package, match: ['/produtos', '/estoque'] },
  { label: 'Vendas', to: '/vendas', icon: ReceiptText, match: ['/vendas', '/vender'] },
  { label: 'Clientes e fiado', to: '/clientes', icon: Users, match: ['/clientes', '/fiado'] },
  { label: 'Pendências', to: '/pendencias', icon: BellRing, match: ['/pendencias'], badge: 'pending' },
  { label: 'Relatórios', to: '/relatorios/vendas', icon: BarChart3, match: ['/relatorios', '/fechamento'] },
  { label: 'Configurações', to: '/configuracoes', icon: Settings, match: ['/configuracoes'] },
]

/** Barra inferior do celular (06 §2): Início · Estoque · Vender · Fiado · Mais. */
export const mobileTabs = [
  { label: 'Início', to: '/', icon: House, match: [] as string[] },
  { label: 'Estoque', to: '/produtos', icon: Package, match: ['/produtos', '/estoque'] },
  { label: 'Vender', to: '/pdv', icon: ShoppingBag, match: ['/pdv', '/vender'], primary: true },
  { label: 'Fiado', to: '/fiado', icon: Wallet, match: ['/fiado', '/clientes'] },
]

export function isActive(item: { to: string; match: string[] }, path: string) {
  if (item.to === '/') return path === '/'
  return [item.to, ...item.match].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}
