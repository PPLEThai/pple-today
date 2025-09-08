#!/bin/bash

set -e

# If not, clone the repo and start the services
cd signoz/deploy/
docker compose -f docker/clickhouse-setup/docker-compose.yaml down
cd ../..
rm -rf signoz
