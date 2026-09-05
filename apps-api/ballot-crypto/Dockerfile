FROM oven/bun:1.4.1-alpine AS base
RUN apk update
RUN apk add --no-cache jq

ARG VERSION=latest

RUN bun add -g turbo@2.5.2

FROM base AS builder

# Set working directory
WORKDIR /app
COPY . .
RUN ls
RUN turbo prune --scope=@api/ballot-crypto --docker

FROM base AS installer
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
RUN jq --arg version "$VERSION" '.version = $version' /app/apps-api/ballot-crypto/package.json > tmp.json && mv tmp.json /app/apps-api/ballot-crypto/package.json

RUN bun run build --filter=@api/ballot-crypto

# Clean bun image, not `base`: the runner needs neither turbo nor jq.
FROM oven/bun:1.4.1-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 ballot-crypto
RUN adduser --system --uid 1001 -G ballot-crypto ballot-crypto
USER ballot-crypto

COPY --from=installer --chown=ballot-crypto:ballot-crypto /app/apps-api/ballot-crypto/build ./

CMD ["bun", "index.js"]
