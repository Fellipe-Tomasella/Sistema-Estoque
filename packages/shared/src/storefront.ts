// Loja virtual (docs/11): o site fica em `<sistema>/<nome-da-loja>`, no mesmo endereço do painel.

/** Primeiro trecho das rotas do painel e do servidor: não pode ser o nome da loja. */
export const PANEL_PATHS = [
  'api',
  'assets',
  'produtos',
  'estoque',
  'vender',
  'vendas',
  'clientes',
  'fiado',
  'pendencias',
  'relatorios',
  'fechamento',
  'configuracoes',
  'login',
  'esqueci-senha',
  'redefinir-senha',
] as const

/** Letras minúsculas sem acento, números e hífen entre eles; 3 a 40 caracteres. */
export const STORE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Sugestão de caminho a partir do nome: “Jooliv Lingeries” → “jooliv-lingeries”. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
}

/** Mensagem de erro do caminho, ou null se ele serve. */
export function storeSlugProblem(slug: string): string | null {
  if (slug.length < 3 || slug.length > 40) return 'O endereço precisa ter de 3 a 40 caracteres.'
  if (!STORE_SLUG.test(slug)) return 'Use só letras minúsculas sem acento, números e hífen (ex.: jooliv-lingeries).'
  if ((PANEL_PATHS as readonly string[]).includes(slug)) return 'Esse endereço já é uma tela do sistema. Escolha outro.'
  return null
}
