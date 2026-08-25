#!/usr/bin/env bash
set -euo pipefail

required_major=22

node_major() {
  "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null
}

if command -v node >/dev/null 2>&1 && [ "$(node_major "$(command -v node)")" = "$required_major" ]; then
  exec "$@"
fi

for runtime_dir in \
  "${NVM_DIR:-"$HOME/.nvm"}"/versions/node/v22.* \
  "$HOME"/.volta/tools/image/node/22.* \
  "$HOME"/.local/share/fnm/node-versions/v22.*/installation \
  "$HOME"/.asdf/installs/nodejs/22.*; do
  runtime_node="$runtime_dir/bin/node"
  if [ -x "$runtime_node" ] && [ "$(node_major "$runtime_node")" = "$required_major" ]; then
    export PATH="$runtime_dir/bin:$PATH"
    exec "$@"
  fi
done

current_version="$(node --version 2>/dev/null || printf 'not found')"
cat >&2 <<EOF
Node.js 22 is required to run the local preview and Azure Functions Core Tools.
The current shell is using Node.js ${current_version}.

Install or select an existing Node.js 22 runtime, then run pnpm preview again.
For nvm: nvm install 22 && nvm use 22
The project does not install global runtimes automatically.
EOF
exit 1
