FROM node:22-alpine3.22 AS base
RUN apk update
RUN apk add --no-cache libc6-compat jq libstdc++

ARG VERSION=latest
ARG LOCAL_ENV="test=test"

ENV BACKOFFICE_DOMAIN_URL="example.com"

RUN npm install -g turbo@2.5.2 bun@1.4.1
 
FROM base AS builder

# Set working directory
WORKDIR /app
COPY . .
 
RUN turbo prune --scope=@client/backoffice --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat libstdc++
WORKDIR /app
 
# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

COPY --from=builder /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN jq --arg version "$VERSION" '.version = $version' /app/apps-client/backoffice/package.json > tmp.json && mv tmp.json /app/apps-client/backoffice/package.json
RUN echo "$LOCAL_ENV" > /app/apps-client/backoffice/.env

RUN bun run build --filter=@client/backoffice
 
FROM nginxinc/nginx-unprivileged:alpine3.22-perl
WORKDIR /app
 
COPY --from=installer /app/apps-client/backoffice/build /usr/share/nginx/html
COPY --from=installer --chown=nginx:nginx /app/apps-client/backoffice/nginx/nginx.conf.tmpl /tmp/nginx.conf.tmpl

EXPOSE 8080
CMD ["/bin/sh", "-c", "envsubst '${BACKOFFICE_DOMAIN_URL}' < /tmp/nginx.conf.tmpl > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]