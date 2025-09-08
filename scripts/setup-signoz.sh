#!/bin/bash

set -e

TAG="v0.93.0"

allow_cors() {
  # Edit Otel collector config to allow CORS
  echo "Edit Otel collector config to allow CORS"
  yq -i e '.receivers.otlp.protocols.http.cors.allowed_origins |= ["https://*", "http://*"]' deploy/docker/otel-collector-config.yaml
}

# Check if signoz is already installed
if [ -d "signoz" ]; then
  # If yes, pull the latest changes
  echo "Signoz is already installed. Pulling the latest changes..."
  cd signoz
  
  allow_cors
  docker compose -f deploy/docker/docker-compose.yaml up -d
  exit 0
fi

# If not, clone the repo and start the services
git clone -b $TAG https://github.com/SigNoz/signoz.git && cd signoz

allow_cors
docker compose -f deploy/docker/docker-compose.yaml up -d
