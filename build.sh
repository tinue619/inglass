#!/bin/bash
# Heroku build script

echo "🔨 Heroku Build Script"
echo "Installing server dependencies..."

cd server
npm install

echo "✅ Build completed successfully"
