#!/bin/bash
# Test build locally using the same Docker environment as CI

set -e

echo "🐳 Testing build in CI-like Docker environment..."
echo "This will use Node.js 18 (same as CI) instead of your local Node.js version"
echo ""

# Build using the same Dockerfile as CI
docker build -t lab-assistant-frontend-test:latest .

if [ $? -eq 0 ]; then
    echo "✅ Build succeeded! Your code will build in CI."
else
    echo "❌ Build failed. Fix the errors above before pushing."
    exit 1
fi