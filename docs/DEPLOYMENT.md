# Server deployment

This follows backend-form's Docker Hub → SSH → Compose deployment. Pushes to `develop` run chat/media/project tests, publish `kirandhakal/pms-backend:<commit SHA>`, run migrations, and wait for database readiness. Pull requests run tests only. Change the workflow branch conditions together if using `main`.

## One-time server setup

Install Docker Engine and Compose v2 with `up --wait` support. Create `/var/www/kanban-backend`, owned by the SSH deploy user. That user must have passwordless sudo for Docker and env (as in the reference deployment); this is privileged access, so use a dedicated deployment account. For a private Docker Hub repository, log in on the server with `sudo docker login` using a read-only token.

Copy `.env.docker.example` to `/var/www/kanban-backend/.env.docker`, fill in database credentials, a random JWT secret, frontend origins, SMTP and any attachment storage settings, then `chmod 600` it. Never commit this file. `DATABASE_HOST` must be reachable from a container; localhost refers to the container itself. DATABASE_URL may alternatively be provided and takes precedence.

Use an existing Kanban database or restore its schema and data first. The repository's migrations extend the existing schema; they are not a complete initial database migration. Back up the database before deployment. Production disables automatic schema synchronization. Do not enable development mode against production to initialize tables.

Configure these GitHub repository secrets:

- `DOCKER_HUB_USERNAME`, `DOCKER_HUB_ACCESS_TOKEN` (write access to the image repository)
- `HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`

The workflow uses the `production` GitHub environment. Configure its protection rules as desired. Change `IMAGE` and `DEPLOY_PATH` in the workflow if necessary. SSH uses port 22.

## HTTPS proxy

The API binds to server loopback port 3001 by default. Configure your existing HTTPS reverse proxy for your API domain, forwarding to `http://127.0.0.1:3001`. For Nginx, include these directives in the appropriate location block:

```nginx
proxy_pass http://127.0.0.1:3001;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 75s;
```

Forward `/api`, `/socket.io/` and `/health/ready` without stripping their prefixes. Configure TLS using your existing server certificate setup. Set HOST_PORT if 3001 is already occupied, and update the proxy accordingly.

## Manual deployment and rollback

Copy `docker-compose.prod.yml` to the deployment directory, then run there:

```sh
export IMAGE=kirandhakal/pms-backend IMAGE_TAG=<published-commit-sha>
sudo env IMAGE="$IMAGE" IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml --env-file .env.docker pull
sudo env IMAGE="$IMAGE" IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml --env-file .env.docker run --rm --no-deps backend node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js
sudo env IMAGE="$IMAGE" IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --wait --wait-timeout 120
curl --fail http://127.0.0.1:3001/health/ready
```

For application rollback, select a previous published SHA and repeat pull/up without migration:run, only after verifying database compatibility. Failed health checks fail CI but do not automatically undo schema or application changes. This single-container deployment has brief downtime; migrations must be compatible with the previous running version. Restore a database backup when schema rollback is required.

The existing docker-compose.yml remains the local development stack. Production uses docker-compose.prod.yml and an external PostgreSQL service.
