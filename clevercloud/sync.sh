#!/bin/bash -l

curl \
  --silent \
  --show-error \
  --request GET \
  --header "Authorization: Bearer ${ADMIN_SECRET}" \
  http://localhost:${PORT}/sync/incremental
