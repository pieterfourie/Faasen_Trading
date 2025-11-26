#!/usr/bin/env bash
set -e

# Load NVM
export NVM_DIR="/home/faasen/.nvm"
# This loads nvm
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/faasen/projects/Faasen-Trading

# Optional: use a specific Node version if you have multiple
# nvm use 20

npm start
