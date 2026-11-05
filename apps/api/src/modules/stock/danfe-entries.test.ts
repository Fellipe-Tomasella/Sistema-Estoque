import { beforeEach, describe, expect, test } from 'bun:test'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'
import { renderPdf } from '../receipts/pdf'
import { parseDanfeLines } from './danfe-reader'

// DANFE fictício no formato do modelo padrão (dados inventados).
const DANFE_LINES = [
  'RECEBEMOS DE CONFECCOES EXEMPLO LTDA OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL',
  'ELETRÔNICA INDICADA ABAIXO. EMISSÃO: 18/06/2026 VALOR TOTAL: R$ 74,49',
  'DANFE Nº. 000.001.234 Série 001',
  'CHAVE DE ACESSO',
  '5226 0612 3456 7800 0195 5500 1000 0012 3416 5678 6244',
  'CNPJ / CPF 12.345.678/0001-95',
  'DADOS DOS PRODUTOS / SERVIÇOS',
  'CÓDIGO PRODUTO DESCRIÇÃO DO PRODUTO / SERVIÇO NCM/SH O/CSOSN CFOP UN QUANT',
  'UNIT TOTAL DESC ICMS ICMS IPI ICMS IPI',
  'FZ001.3 CAMISOLA LIA (VERDE MILITAR) - Tamanho 62121000 0/102 6102 UN 2,0000 13,4950 26,99 0,00 0,00 0,00 0,00',
  'G',
  'FZ002.2 CAMISOLA LIA (AZUL) - Tamanho M 62121000 0/102 6102 UN 1,0000 13,4950 13,50 0,00 0,00 0,00 0,00',
  'FZ003.1 PIJAMA LONGO INF. SUEDE (CAPIVARA 62121000 0/102 6102 UN 1,0000 21,0000 21,00 0,00 0,00 0,00 0,00',
  'DE OCULOS) - Tamanho EXG',
  'FZ004.2 CUECA BOX (PRETO) - Tamanho M 62121000 0/102 6102 UN 3,0000 4,5000 13,50 0,00 0,00 0,00 0,00',
  'DADOS ADICIONAIS',
  'Inf. Contribuinte: Pedido: 6145806.',
]

let cookie: string
let userId: string

beforeEach(async () => {
  await resetDatabase()
  const session = await loggedIn()
  cookie = session.cookie
  userId = session.user.id
})

async function preview(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request('POST', '/stock/entries/nfe-preview', { cookie, body: form })
}

describe('DANFE em PDF (RN-EST-11/12)', () => {
  test('lê cabeçalho e itens, juntando a descrição que quebrou de linha', () => {
    const doc = parseDanfeLines(DANFE_LINES)
    expect(doc).toMatchObject({
      accessKey: '52260612345678000195550010000012341656786244',
      number: '1234',
      series: '1',
      issuedAt: '2026-06-18',
      supplier: { name: 'CONFECCOES EXEMPLO LTDA', document: '12345678000195' },
    })
    expect(doc.items.map((i) => [i.code, i.description, i.quantity, i.unitCostCents])).toEqual([
      ['FZ001.3', 'CAMISOLA LIA (VERDE MILITAR) - Tamanho G', 2, 1350],
      ['FZ002.2', 'CAMISOLA LIA (AZUL) - Tamanho M', 1, 1350],
      ['FZ003.1', 'PIJAMA LONGO INF. SUEDE (CAPIVARA DE OCULOS) - Tamanho EXG', 1, 2100],
      ['FZ004.2', 'CUECA BOX (PRETO) - Tamanho M', 3, 450],
    ])
  })

  test('PDF que não é nota é recusado com mensagem clara', async () => {
    const pdf = await renderPdf([{ text: 'Lista de compras: pão, leite' }])
    const res = await preview(new File([new Uint8Array(pdf)], 'outro.pdf', { type: 'application/pdf' }))
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('não parece ser uma nota fiscal')
  })

  test('PDF de verdade: prévia casa por nome+cor+tamanho; o resto vira produto novo e entra no estoque', async () => {
    // a Camisola Lia azul M já existe; o resto é novo
    await createProduct(userId, { name: 'Camisola Lia', variants: [['Azul', 'M', 0]] })
    const pdf = await renderPdf(DANFE_LINES.map((text) => ({ text, fontSize: 7 })))
    const res = await preview(new File([new Uint8Array(pdf)], 'nota.pdf', { type: 'application/pdf' }))
    expect(res.status).toBe(200)
    const items = res.body.items as { code: string; parsed: unknown; match: { by: string } | null }[]
    expect(items).toHaveLength(4)
    expect(items[0]!.parsed).toEqual({ name: 'Camisola Lia', color: 'Verde militar', size: 'G' })
    expect(items[1]!.match?.by).toBe('name')
    expect(items.filter((i) => !i.match)).toHaveLength(3)

    // cadastra os novos de uma vez (agrupados por produto), com o preço de venda escolhido
    const created = await request('POST', '/products/from-invoice', {
      cookie,
      body: {
        products: [
          {
            name: 'Camisola Lia',
            basePriceCents: 3990,
            costCents: 1350,
            variants: [{ color: 'Verde militar', size: 'G' }],
          },
          {
            name: 'Pijama Longo Inf. Suede',
            basePriceCents: 5990,
            costCents: 2100,
            variants: [{ color: 'Capivara de oculos', size: 'EXG' }],
          },
          { name: 'Cueca Box', basePriceCents: 1490, costCents: 450, variants: [{ color: 'Preto', size: 'M' }] },
        ],
      },
    })
    expect(created.status).toBe(200)
    expect(created.body).toHaveLength(3)
    // a Camisola Lia não foi duplicada: ganhou a variação nova
    const lia = (await services.products.list({ q: 'camisola lia' })).items
    expect(lia).toHaveLength(1)
    expect(lia[0]!.variants.map((v) => v.label).sort()).toEqual(['Azul / M', 'Verde militar / G'])
    expect(lia[0]!.reference).toBe('P00001')

    // na próxima leitura, tudo já casa
    const again = await preview(new File([new Uint8Array(pdf)], 'nota.pdf', { type: 'application/pdf' }))
    expect(again.body.items.every((i: { match: unknown }) => i.match)).toBe(true)
  })
})
