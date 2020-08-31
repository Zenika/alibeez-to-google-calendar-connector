#!/bin/bash -l

curl \
  --method GET
  --header "Authorization: Bearer ${ADMIN_SECRET}"
  http://localhost:${PORT}/sync/incremental
