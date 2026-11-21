#!/usr/bin/env bash
set -euo pipefail
umask 077
# Hosted runners can retain another job's disposable Supabase ports for
# a short time.  Isolate both the project name and the published port
# range per workflow run so this security probe never binds to another
# job's database or fails on its inbucket port.
project_id="sfm-${1:?missing job purpose}-${GITHUB_RUN_ID}"
local_dir="$RUNNER_TEMP/$project_id"
base_port=$((49152 + (GITHUB_RUN_ID % 14000)))
mkdir -p "$local_dir"
supabase init --workdir "$local_dir"
sed -i -E "s/^project_id = \".*\"/project_id = \"${project_id}\"/" "$local_dir/supabase/config.toml"
sed -i \
  -e "s/port = 54321/port = ${base_port}/" \
  -e "s/port = 54322/port = $((base_port + 1))/" \
  -e "s/port = 54323/port = $((base_port + 2))/" \
  -e "s/port = 54324/port = $((base_port + 3))/" \
  -e "s/port = 54327/port = $((base_port + 4))/" \
  "$local_dir/supabase/config.toml"
printf 'SFM_ISOLATION_DIR=%s\nSFM_ISOLATION_PROJECT=%s\n' "$local_dir" "$project_id" >> "$GITHUB_ENV"
mkdir -p "$local_dir/supabase/migrations"
cp supabase/migrations/*.sql "$local_dir/supabase/migrations/"
# No linked project, production credentials, seed rows, or remote DB push.
supabase start --workdir "$local_dir" \
  --exclude studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor \
  > "$RUNNER_TEMP/sfm-local-start.log" 2>&1 || {
    echo 'Local Supabase startup or migration failed.' >&2
    exit 1
  }
supabase status --workdir "$local_dir" -o json > "$RUNNER_TEMP/sfm-local-status.json"
chmod 600 "$RUNNER_TEMP/sfm-local-status.json"
