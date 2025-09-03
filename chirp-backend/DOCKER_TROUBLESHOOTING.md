# Docker Troubleshooting Guide

## Issues Fixed

### 1. "config is not a recognized command" Error
**Problem**: The MinIO setup container was trying to use `/usr/bin/mc config` instead of `mc config`.
**Solution**: Updated docker-compose.yml to use `mc` directly instead of the full path.

### 2. Missing Environment Files
**Problem**: The `.env` files were missing for both node-api and python-ai services.
**Solution**: Created `.env` files based on the configuration in docker-compose.yml.

### 3. PostgreSQL Role "chrtp" Error
**Problem**: This error suggests a typo in database credentials somewhere.
**Solution**: Ensured all database credentials use "chirp" consistently.

## Quick Start

1. Make sure Docker is installed and running:
   ```bash
   sudo service docker start
   ```

2. Run the startup script:
   ```bash
   ./start-backend.sh
   ```

3. Or manually start services:
   ```bash
   sudo docker compose up --build -d
   ```

## Common Issues

### MinIO Setup Fails
- The minio-setup container may fail initially but should retry
- Check logs: `sudo docker compose logs minio-setup`

### Database Connection Issues
- Ensure PostgreSQL container is healthy before other services start
- Check logs: `sudo docker compose logs postgres`

### Node.js API Fails to Start
- Ensure all environment variables are set in `node-api/.env`
- Check logs: `sudo docker compose logs node-api`

## Service URLs

- **Node.js API**: http://localhost:3000
- **Python AI**: http://localhost:8000  
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MinIO**: http://localhost:9000
- **MinIO Console**: http://localhost:9001

## Useful Commands

```bash
# Check service status
sudo docker compose ps

# View logs for all services
sudo docker compose logs -f

# View logs for specific service
sudo docker compose logs -f [service-name]

# Stop all services
sudo docker compose down

# Rebuild and restart
sudo docker compose up --build -d

# Clean up everything
sudo docker compose down -v --remove-orphans
```