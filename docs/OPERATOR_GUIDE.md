# WinCVEx Operator Guide

This guide is intended for lab operators and administrators who need to deploy, maintain and troubleshoot the WinCVEx environment.  It covers configuration, startup, monitoring and common operational tasks.

## 1. Configuration

All services read their configuration from environment variables defined in the `.env` file at the repository root.  A template is provided as `.env.example`.  At minimum you should set:

| Variable            | Description                                        |
|---------------------|----------------------------------------------------|
| `POSTGRES_DB`       | Name of the PostgreSQL database (default: `wincvex`) |
| `POSTGRES_PASSWORD` | Password for the `postgres` user                    |
| `SECRET_KEY`        | Secret used by FastAPI for session security         |
| `JWT_SECRET`        | Secret used to sign JSON Web Tokens                |
| `GRAFANA_ADMIN_PASSWORD` | Password for the Grafana `admin` account       |
| `CORS_ORIGINS`      | Comma‑separated list of allowed origins for the API |

After copying `.env.example` to `.env`, edit the file to supply strong secrets.  These values are loaded by Docker Compose and passed into the containers at runtime.

## 2. Building and Running

To build the images and start the stack run:

```sh
docker compose up --build
```

The first build can take several minutes as it installs dependencies for Node.js and Python.  Subsequent runs will re‑use cached layers.  Compose automatically waits until dependent services are healthy before starting the next service.  You can check the status of each container with `docker compose ps`.

### Stopping and Restarting

Press `Ctrl+C` in the terminal where the stack is running to stop all services.  To restart the lab run `docker compose up` again.  Data volumes for Postgres and Grafana persist across restarts.  To reset the lab completely, delete the `postgres_data` and `grafana_data` volumes with:

```sh
docker compose down -v
```

## 3. Monitoring and Logs

Prometheus scrapes metrics from itself and the API service.  Loki collects logs from all containers via Promtail.  Grafana reads both data sources and exposes prebuilt dashboards.  Access Grafana at <http://localhost:8080/grafana/>.  Anonymous login is enabled; the admin password is controlled via the `GRAFANA_ADMIN_PASSWORD` environment variable.

### Exporting Logs

If you wish to store logs outside of Docker (for example, for auditing), mount an additional volume under `promtail` in `docker-compose.yml` that points to a host directory.  You can then configure Loki’s filesystem storage to persist logs between runs.

## 4. Troubleshooting

- **Service remains unhealthy** – Run `docker compose logs <service>` to inspect logs.  The healthchecks for `api`, `web` and `agents` rely on HTTP endpoints; if the logs indicate a port conflict or import error, rebuild the images (`docker compose up --build`).
- **Database migrations not applied** – The FastAPI service automatically calls `SQLModel.metadata.create_all` on startup.  If you change models, remove the `postgres_data` volume or manually apply migrations with Alembic (not included by default).
- **Cannot connect to the web UI** – Ensure that port `8080` is free on the host.  If another process is bound to the port, change the mapping in `docker-compose.yml` under the `nginx` service (e.g. `ports: ["9090:80"]`).
- **WebSocket issues** – The API uses a very simple WebSocket implementation that broadcasts simulated log lines.  If connections drop immediately, verify that `nginx.conf` includes the `upgrade` headers in the `/api/ws/` location and that your browser is connecting over `ws://localhost:8080` (not `wss://`).

## 5. Extending the Lab

To add new agents, copy one of the existing agent directories under `services/agents/` and update the `AGENTS` list in `apps/api/app/routers/agents.py` and the `docker-compose.yml` file.  When adding new simulated vulnerabilities adjust the `vulnerabilities` map in each agent’s `agent.py` and update the frontend accordingly.

When upgrading dependencies:

- Bump the version numbers in `requirements.txt` and `package.json`.
- Rebuild the images with `docker compose build`.
- For SQLModel upgrades above `0.0.8`, update SQLAlchemy to `2.x` and adjust imports.

### Security Considerations

This lab does **not** include real exploits.  The terminal is strictly allow‑listed and the mis‑configuration toggles do not translate to actual network vulnerabilities.  Do not expose the lab to the internet.  For a production‑like deployment you should disable anonymous access to Grafana and add proper authentication and authorization layers around both the API and the web UI.