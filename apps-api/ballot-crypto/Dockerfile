FROM node:22-alpine3.22 AS base
RUN apk update
RUN apk add --no-cache libc6-compat jq

ARG VERSION=latest

RUN npm install -g turbo@2.5.2

FROM base AS builder

# Set working directory
WORKDIR /app
COPY . .
RUN ls
RUN turbo prune --scope=@api/ballot-crypto --docker

FROM base AS installer
WORKDIR /app

RUN npm install -g pnpm@9.9.0

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prefer-offline

# Build the project
COPY --from=builder /app/out/full/ .
RUN jq --arg version "$VERSION" '.version = $version' /app/apps-api/ballot-crypto/package.json > tmp.json && mv tmp.json /app/apps-api/ballot-crypto/package.json

RUN pnpm build --filter=@api/ballot-crypto

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 ballot-crypto
RUN adduser --system --uid 1001 ballot-crypto
USER ballot-crypto

COPY --from=installer --chown=ballot-crypto:nodejs /app/apps-api/ballot-crypto/build ./

CMD ["node", "index.js"]
