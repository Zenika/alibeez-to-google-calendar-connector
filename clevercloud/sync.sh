#!/bin/bash -l

curl \
  --request GET \
  --header "Authorization: Bearer ${ADMIN_SECRET}" \
  http://localhost:${PORT}/sync/incremental
