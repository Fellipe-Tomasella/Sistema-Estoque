import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
  }
}

/** Telas ainda não implementadas apontam para cá (substituídas etapa por etapa). */

const appRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'home',
    component: () => import('@/modules/dashboard/pages/HomePage.vue'),
    meta: { title: 'Início' },
  },
  {
    path: 'produtos',
    name: 'products',
    component: () => import('@/modules/products/pages/ProductsListPage.vue'),
    meta: { title: 'Produtos e estoque' },
  },
  {
    path: 'produtos/novo',
    name: 'product-new',
    component: () => import('@/modules/products/pages/ProductFormPage.vue'),
    meta: { title: 'Novo produto' },
  },
  {
    path: 'produtos/:id/editar',
    name: 'product-edit',
    component: () => import('@/modules/products/pages/ProductFormPage.vue'),
    meta: { title: 'Editar produto' },
  },
  {
    path: 'produtos/:id',
    name: 'product',
    component: () => import('@/modules/products/pages/ProductDetailPage.vue'),
    meta: { title: 'Produto' },
  },
  {
    path: 'estoque/entradas',
    name: 'stock-entries',
    component: () => import('@/modules/stock/pages/EntriesListPage.vue'),
    meta: { title: 'Entradas de estoque' },
  },
  {
    path: 'estoque/entradas/nova',
    name: 'stock-entry-new',
    component: () => import('@/modules/stock/pages/EntryFormPage.vue'),
    meta: { title: 'Nova entrada' },
  },
  {
    path: 'estoque/acertos/novo',
    name: 'stock-adjustment-new',
    component: () => import('@/modules/stock/pages/AdjustmentPage.vue'),
    meta: { title: 'Acerto de estoque' },
  },
  {
    path: 'estoque/importar',
    name: 'stock-import',
    component: () => import('@/modules/stock/pages/ImportPage.vue'),
    meta: { title: 'Importar planilha' },
  },
  {
    path: 'estoque/movimentos',
    name: 'stock-movements',
    component: () => import('@/modules/stock/pages/MovementsPage.vue'),
    meta: { title: 'Movimentos de estoque' },
  },
  {
    path: 'vender/:draftId?',
    name: 'pos',
    component: () => import('@/modules/pos/pages/PosPage.vue'),
    meta: { title: 'Nova venda' },
  },
  {
    path: 'vendas',
    name: 'sales',
    component: () => import('@/modules/sales/pages/SalesListPage.vue'),
    meta: { title: 'Vendas' },
  },
  {
    path: 'vendas/:id/devolver',
    name: 'sale-return',
    component: () => import('@/modules/returns/pages/ReturnPage.vue'),
    meta: { title: 'Devolver ou trocar' },
  },
  {
    path: 'vendas/:id',
    name: 'sale',
    component: () => import('@/modules/sales/pages/SaleDetailPage.vue'),
    meta: { title: 'Venda' },
  },
  {
    path: 'clientes',
    name: 'customers',
    component: () => import('@/modules/customers/pages/CustomersListPage.vue'),
    meta: { title: 'Clientes e fiado' },
  },
  {
    path: 'clientes/:id',
    name: 'customer',
    component: () => import('@/modules/customers/pages/CustomerDetailPage.vue'),
    meta: { title: 'Cliente' },
  },
  {
    path: 'fiado',
    name: 'receivables',
    component: () => import('@/modules/receivables/pages/ReceivablesPage.vue'),
    meta: { title: 'Fiado em aberto' },
  },
  {
    path: 'fiado/receber',
    name: 'receive',
    component: () => import('@/modules/receivables/pages/ReceivePage.vue'),
    meta: { title: 'Receber fiado' },
  },
  {
    path: 'pendencias',
    name: 'pending',
    component: () => import('@/modules/pending/pages/PendingPage.vue'),
    meta: { title: 'Pendências' },
  },
  {
    path: 'relatorios/vendas',
    name: 'report-sales',
    component: () => import('@/modules/reports/pages/SalesReportPage.vue'),
    meta: { title: 'Vendas por período' },
  },
  {
    path: 'relatorios/fiado',
    name: 'report-receivables',
    component: () => import('@/modules/reports/pages/ReceivablesReportPage.vue'),
    meta: { title: 'Fiado em aberto' },
  },
  {
    path: 'relatorios/mais-vendidos',
    name: 'report-ranking',
    component: () => import('@/modules/reports/pages/RankingReportPage.vue'),
    meta: { title: 'Mais e menos vendidos' },
  },
  {
    path: 'fechamento/:data?',
    name: 'closing',
    component: () => import('@/modules/reports/pages/ClosingPage.vue'),
    meta: { title: 'Fechamento do dia' },
  },
  {
    path: 'configuracoes',
    name: 'settings',
    component: () => import('@/modules/settings/pages/SettingsPage.vue'),
    meta: { title: 'Configurações' },
  },
]

const routes: RouteRecordRaw[] = [
  // Layout persistente: o menu é montado uma vez; só a área de conteúdo troca.
  // Vem antes do layout de acesso: os dois têm path '/', e '/' precisa cair aqui.
  { path: '/', component: () => import('@/layouts/AppLayout.vue'), children: appRoutes },
  // PDV clássico em tela cheia, fora do layout com menu (decisão 041)
  {
    path: '/pdv/:draftId?',
    name: 'pdv',
    component: () => import('@/modules/pos/pages/PdvPage.vue'),
    meta: { title: 'PDV' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/modules/auth/pages/LoginPage.vue'),
        meta: { public: true, title: 'Entrar' },
      },
      {
        path: 'esqueci-senha',
        name: 'forgot-password',
        component: () => import('@/modules/auth/pages/ForgotPasswordPage.vue'),
        meta: { public: true, title: 'Esqueci a senha' },
      },
      {
        path: 'redefinir-senha',
        name: 'reset-password',
        component: () => import('@/modules/auth/pages/ResetPasswordPage.vue'),
        meta: { public: true, title: 'Nova senha' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/components/common/NotFoundPage.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

// RN-ACE-01: tudo exige login, exceto as telas públicas de acesso.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.checked) await auth.loadSession().catch(() => null)
  if (to.meta.public) return auth.user && to.name === 'login' ? { name: 'home' } : true
  if (!auth.user) return { name: 'login', query: to.fullPath === '/' ? {} : { voltar: to.fullPath } }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Estoque` : 'Estoque'
})
