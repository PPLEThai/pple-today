import { Static, t } from 'elysia'

export const AboutUs = t.Object({
  id: t.String({ description: 'About us ID' }),
  name: t.String({ description: 'Card title text' }),
  url: t.String({ description: 'URL to go to', format: 'uri' }),
  iconImage: t.String({ description: 'Icon image URL', format: 'uri' }),
  backgroundColor: t.String({
    description: 'Hexadecimal background color',
    pattern: '^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$',
  }),
})

export type AboutUs = Static<typeof AboutUs>
