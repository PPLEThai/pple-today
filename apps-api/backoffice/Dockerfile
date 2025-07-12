FROM node:22-alpine3.22 AS base
RUN apk update
RUN apk add --no-cache libc6-compat

RUN npm install -g turbo@2.5.2
 
FROM base AS builder

# Set working directory
WORKDIR /app
COPY . .
 
RUN turbo prune --scope=@api/backoffice --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
RUN npm install -g pnpm@9.9.0

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prefer-offline

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm build --filter=@api/backoffice
 
FROM base AS runner
WORKDIR /app
 
RUN addgroup --system --gid 1001 backoffice
RUN adduser --system --uid 1001 backoffice
USER backoffice

COPY --from=installer --chown=backoffice:nodejs /app/apps-api/backoffice/build ./

CMD ["node", "index.js"]