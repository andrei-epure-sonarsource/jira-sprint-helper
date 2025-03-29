#!/bin/bash

# Exit on error
set -e

echo "=== 🚀 Starting build and deployment ==="

# Navigate to the React app directory
echo "=== 📂 Changing to React app directory ==="
cd "$(dirname "$0")/static/hello-world"

# Install dependencies if needed (uncomment if you want this to run each time)
# echo "=== 📦 Installing dependencies ==="
# npm install

# Build the React app
echo "=== 🔨 Building React app ==="
npm run build

# Return to project root
echo "=== 📂 Returning to project root ==="
cd ../..

# Run Forge deployment
echo "=== 🚀 Deploying with Forge ==="
forge deploy

echo "=== ✅ Deployment complete! ==="