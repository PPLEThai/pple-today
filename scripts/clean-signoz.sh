#!/bin/bash

set -e
docker compose -f signoz/deploy/docker/docker-compose.yaml down
rm -rf signoz
