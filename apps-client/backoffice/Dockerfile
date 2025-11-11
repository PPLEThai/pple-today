FROM node:22-alpine3.22 AS base
RUN apk update
RUN apk add --no-cache libc6-compat jq

ARG VERSION=latest
ARG LOCAL_ENV="test=test"

ENV BACKOFFICE_DOMAIN_URL="example.com"

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
 
FROM nginxinc/nginx-unprivileged:alpine3.22-perl
WORKDIR /app
 
COPY --from=installer /app/apps-client/backoffice/build /usr/share/nginx/html
COPY --from=installer --chown=nginx:nginx /app/apps-client/backoffice/nginx/nginx.conf.tmpl /etc/nginx/nginx.conf.tmpl

EXPOSE 8080
CMD ["/bin/sh", "-c", "envsubst < /etc/nginx/nginx.conf.tmpl > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]