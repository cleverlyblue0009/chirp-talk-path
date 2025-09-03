#!/bin/bash

# Chirp Backend Startup Script
# This script handles the Docker setup and startup process

echo "🚀 Starting Chirp Backend Services..."

# Check if Docker is running
if ! sudo docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting Docker service..."
    sudo service docker start
    sleep 5
fi

# Check if .env files exist
if [ ! -f "node-api/.env" ]; then
    echo "⚠️  Creating node-api/.env from .env.example..."
    cp node-api/.env.example node-api/.env 2>/dev/null || echo "✅ .env file already created"
fi

if [ ! -f "python-ai/.env" ]; then
    echo "⚠️  Creating python-ai/.env from .env.example..."
    cp python-ai/.env.example python-ai/.env 2>/dev/null || echo "✅ .env file already created"
fi

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
sudo docker compose down --remove-orphans 2>/dev/null

# Build and start services
echo "🔧 Building and starting services..."
sudo docker compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
sudo docker compose ps

echo ""
echo "✅ Backend services are starting up!"
echo "📝 Service URLs:"
echo "   • Node.js API: http://localhost:3000"
echo "   • Python AI: http://localhost:8000"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo "   • MinIO: http://localhost:9000"
echo "   • MinIO Console: http://localhost:9001"
echo ""
echo "🔍 To check logs: sudo docker compose logs -f [service-name]"
echo "🛑 To stop: sudo docker compose down"