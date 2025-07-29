FROM node:22-alpine3.22 AS base
RUN apk update
RUN apk add --no-cache libc6-compat jq

ARG VERSION=latest
ARG LOCAL_ENV="test=test"

RUN npm install -g turbo@2.5.2
RUN npm install -g pnpm@9.9.0
 
FROM base AS builder

# Set working directory
WORKDIR /app
COPY . .
 
RUN turbo prune --scope=@client/backoffice --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prefer-offline

# Build the project
COPY --from=builder /app/out/full/ .
RUN jq --arg version "$VERSION" '.version = $version' /app/apps-client/backoffice/package.json > tmp.json && mv tmp.json /app/apps-client/backoffice/package.json
RUN echo "$LOCAL_ENV" > /app/apps-client/backoffice/.env

RUN pnpm build --filter=@client/backoffice
 
FROM base AS runner
WORKDIR /app
 
RUN addgroup --system --gid 1001 backoffice
RUN adduser --system --uid 1001 backoffice
USER backoffice

COPY --from=installer --chown=backoffice:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=backoffice:nodejs /app/apps-client/backoffice/build ./build
COPY --from=installer --chown=backoffice:nodejs /app/apps-client/backoffice/package.json ./package.json

EXPOSE 3000

CMD ["pnpm", "start"]