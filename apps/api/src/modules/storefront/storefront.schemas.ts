import { t } from 'elysia'

const OptionalText = (maxLength: number) => t.Optional(t.Nullable(t.String({ maxLength })))

export const UpdateStorefrontBody = t.Object({
  enabled: t.Optional(t.Boolean()),
  slug: OptionalText(40),
  title: OptionalText(80),
  tagline: OptionalText(160),
  about: OptionalText(3000),
  whatsapp: OptionalText(30),
  instagram: OptionalText(60),
  accentColor: t.Optional(t.String({ maxLength: 7 })),
  hideSoldOut: t.Optional(t.Boolean()),
  notifyEmail: OptionalText(120),
  checkoutNotice: OptionalText(500),
  notesLabel: OptionalText(80),
  notesRequired: t.Optional(t.Boolean()),
})
export type UpdateStorefrontInput = typeof UpdateStorefrontBody.static
