FROM node:22-alpine3.22 AS base
RUN apk update
RUN apk add --no-cache libc6-compat jq libstdc++

ARG VERSION=latest

RUN npm install -g turbo@2.5.2 bun@1.4.1

RUN apk update
RUN apk add --no-cache ca-certificates
 
FROM base AS builder

# Set working directory
WORKDIR /app
COPY . .
 
RUN turbo prune --scope=@api/backoffice --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat libstdc++
WORKDIR /app
 

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

COPY --from=builder /app/out/bun.lock ./bun.lock
# `turbo prune` does not copy patches/, but the root manifest's patchedDependencies
# still references it and bun validates every patch file up front.
COPY --from=builder /app/patches ./patches
RUN bun install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN jq --arg version "$VERSION" '.version = $version' /app/apps-api/backoffice/package.json > tmp.json && mv tmp.json /app/apps-api/backoffice/package.json

RUN bun run build --filter=@api/backoffice
 
# The service runs on bun, so the final image needs no node at all.
# Build stages stay on node: turbo and tsx (which drives esbuild) run there.
FROM oven/bun:1.4.1-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates

RUN addgroup --system --gid 1001 backoffice
RUN adduser --system --uid 1001 -G backoffice backoffice

COPY --from=installer /app/apps-api/backoffice/certificates/*.pem /usr/local/share/ca-certificates/

RUN chmod 644 /usr/local/share/ca-certificates/*.pem
RUN update-ca-certificates

USER backoffice

COPY --from=installer --chown=backoffice:backoffice /app/apps-api/backoffice/build ./

CMD ["bun", "index.js"]
