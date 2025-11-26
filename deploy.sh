#!/usr/bin/env bash
set -e

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Restarting systemd service..."
sudo systemctl restart faasentrading

echo "Done 🎉"
