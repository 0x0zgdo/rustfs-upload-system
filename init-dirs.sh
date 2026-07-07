#!/bin/bash
set -e

echo "Creating local volume directories on T9..."
mkdir -p ./data/rustfs
mkdir -p ./data/postgres
mkdir -p ./data/redis

echo "Setting correct permissions for RustFS (10001:10001)..."
# Note: chown might fail on macOS without sudo, but Docker Desktop usually manages mounts transparently.
# We try running it with sudo, which might prompt for a password if run manually by the user.
sudo chown -R 10001:10001 ./data/rustfs || {
  echo "Warning: chown failed (likely requires sudo password)."
  echo "You may need to manually run: sudo chown -R 10001:10001 ./data/rustfs"
}

echo "Initialization complete."
