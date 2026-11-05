import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import {
  AddVariantsBody,
  CodesQuery,
  CreateProductBody,
  GenerateCodesBody,
  IdParams,
  ImageParams,
  ListProductsQuery,
  MinStockBody,
  OptionParams,
  OptionValueQuery,
  ProductsFromInvoiceBody,
  RenameOptionBody,
  ReorderImagesBody,
  UpdateImageBody,
  UpdateProductBody,
  UploadImageBody,
} from './products.schemas'

export const productsRoutes = new Elysia({ prefix: '/products' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/', ({ query, services }) => services.products.list(query), { query: ListProductsQuery })
  .get('/suggestions', ({ services }) => services.productOptions.suggestions())
  // RN-PRO-17: aba Opções (cores, tamanhos e categorias)
  .get('/options', ({ services }) => services.productOptions.list())
  .put(
    '/options/:kind',
    ({ params, body, services, user }) => services.productOptions.rename(params.kind, body, user.id),
    {
      params: OptionParams,
      body: RenameOptionBody,
    },
  )
  .delete(
    '/options/:kind',
    ({ params, query, services, user }) => services.productOptions.remove(params.kind, query.value, user.id),
    { params: OptionParams, query: OptionValueQuery },
  )
  // RN-EST-12: cadastrar os produtos novos que vieram na nota do fornecedor
  .post('/from-invoice', ({ body, services, user }) => services.products.createFromInvoice(body, user.id), {
    body: ProductsFromInvoiceBody,
  })
  // RN-PRO-16: tela Códigos e etiquetas
  .get(
    '/codes',
    ({ query, services }) => services.products.listCodes({ ...query, ids: query.ids?.split(',').filter(Boolean) }),
    { query: CodesQuery },
  )
  .post('/codes/generate', ({ body, services, user }) => services.products.generateCodes(body.variantIds, user.id), {
    body: GenerateCodesBody,
  })
  .get('/:id', ({ params, services }) => services.products.get(params.id), { params: IdParams })
  .post(
    '/',
    ({ body, services, user, set }) => {
      set.status = 201
      return services.products.create(body, user.id)
    },
    { body: CreateProductBody },
  )
  .patch('/:id', ({ params, body, services, user }) => services.products.update(params.id, body, user.id), {
    params: IdParams,
    body: UpdateProductBody,
  })
  .post(
    '/:id/variants',
    ({ params, body, services, user }) => services.products.addVariants(params.id, body.variants, user.id),
    { params: IdParams, body: AddVariantsBody },
  )
  .post('/:id/min-stock', ({ params, body, services }) => services.products.setMinStock(params.id, body.minStock), {
    params: IdParams,
    body: MinStockBody,
  })
  .post('/:id/deactivate', ({ params, services, user }) => services.products.setActive(params.id, false, user.id), {
    params: IdParams,
  })
  .post('/:id/activate', ({ params, services, user }) => services.products.setActive(params.id, true, user.id), {
    params: IdParams,
  })
  .get('/:id/images', ({ params, services }) => services.productImages.list(params.id), { params: IdParams })
  .post(
    '/:id/images',
    ({ params, body, services, user, set }) => {
      set.status = 201
      return services.productImages.add(params.id, body.file, body.color, user.id)
    },
    { params: IdParams, body: UploadImageBody },
  )
  .post('/:id/images/order', ({ params, body, services }) => services.productImages.reorder(params.id, body.ids), {
    params: IdParams,
    body: ReorderImagesBody,
  })
  .patch(
    '/:id/images/:imageId',
    ({ params, body, services }) => services.productImages.update(params.id, params.imageId, body),
    { params: ImageParams, body: UpdateImageBody },
  )
  .delete(
    '/:id/images/:imageId',
    ({ params, services, user }) => services.productImages.remove(params.id, params.imageId, user.id),
    { params: ImageParams },
  )
  .delete(
    '/:id',
    async ({ params, services, user }) => {
      await services.products.remove(params.id, user.id)
      return { ok: true }
    },
    { params: IdParams },
  )
