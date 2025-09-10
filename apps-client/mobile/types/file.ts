import { ExtractBodyRequest } from '@pple-today/api-client'

import { ApplicationApiSchema } from '@api/backoffice'

export type ImageMimeType = ExtractBodyRequest<
  ApplicationApiSchema,
  'post',
  '/profile/upload-url'
>['contentType']
