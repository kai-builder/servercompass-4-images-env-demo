# ServerCompass 4-Image Env Demo

A Docker Compose demo stack with **4 images/services** for testing ServerCompass multi-service + env update flows.

Services:
1. `frontend` (custom image) - web UI that shows runtime env values
2. `api` (custom image) - returns env values and dependency health
3. `redis` (`redis:7-alpine`)
4. `postgres` (`postgres:16-alpine`)

## Quick Start

```bash
docker compose up -d --build
```

Open:
- Frontend: http://localhost:8080
- API JSON: http://localhost:4000/env

## Public Registry

This repo can publish its custom images to GitHub Container Registry (GHCR) through GitHub Actions.

Published image names for this repository:
- `ghcr.io/kai-builder/servercompass-4-images-env-demo-frontend:latest`
- `ghcr.io/kai-builder/servercompass-4-images-env-demo-api:latest`

Workflow file:
- `.github/workflows/publish-ghcr.yml`

After the first workflow run, make both GHCR packages public in GitHub so Server Compass can pull them anonymously.

## Test Env Updates

1. Edit `.env` (for example change `DEMO_MESSAGE`).
2. Recreate API container so it picks up new env:

```bash
docker compose up -d --force-recreate api
```

3. Refresh http://localhost:8080 and click **Refresh env**.

## Server Compass Note

This demo is safe to deploy even when the repo-root `.env` does not exist yet.
The compose file includes demo defaults for the required Postgres and app env vars,
so first deploy works on Server Compass before you save custom env vars in the UI.

## Stop

```bash
docker compose down
```
