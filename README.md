# WinCVEx Cyber Lab

WinCVEx is a **training‑only** cyber lab that simulates a Windows‑style enterprise using a set of self‑contained Linux containers.  It is designed for blue‑teamers to practice remediating common mis‑configurations without exposing any real vulnerabilities.  The lab can be started with a single command and runs entirely on your own machine.

## Project Structure

```
.
├── apps
│   ├── api         # FastAPI backend providing REST APIs and WebSocket
│   └── web         # Next.js frontend with animated network map and terminal
├── services
│   └── agents      # Simulated host containers (dc, host‑b, host‑c)
├── infra
│   ├── nginx       # Reverse proxy configuration
│   ├── prometheus  # Metrics configuration
│   ├── loki        # Logs configuration
│   └── promtail    # Log forwarder configuration
├── docs            # User and operator guides
├── docker-compose.yml
├── .env.example    # Template environment file
└── SAFETY.md       # Notes about safe simulation
```

### Key Components

- **Next.js Frontend**: Implements a Windows‑style interface using Tailwind CSS, Framer Motion and D3.  Before login you see an animated network topology.  After login you can select a machine, open a jailed terminal and view logs/metrics.
- **FastAPI Backend**: Handles user authentication, maintains the state of simulated vulnerabilities, communicates with the agent containers and exposes a small WebSocket endpoint for log streaming.
- **Agent Services**: Three lightweight containers (`wincvex-dc`, `wincvex-host-b`, `wincvex-host-c`) that simulate domain controller and hosts.  Each exposes an API for toggling simulated vulnerabilities and a restricted command execution endpoint.
- **Observability Stack**: Prometheus scrapes metrics from all services, Loki collects logs via Promtail, and Grafana provides dashboards embedded in the web UI.
- **Reverse Proxy**: Nginx routes traffic on port `8080` to the web frontend, API, Grafana and Loki.  A DNS resolver is configured to allow resolving Docker service names.

## Getting Started

1. **Clone and prepare the environment**:

   ```sh
   git clone <this repository>
   cd wincvex
   cp .env.example .env  # fill in secrets (e.g. POSTGRES_PASSWORD, SECRET_KEY, JWT_SECRET, GRAFANA_ADMIN_PASSWORD)
   ```

2. **Build and run** the lab:

   ```sh
   docker compose up --build
   ```

   The first run may take a few minutes as Docker builds each image and installs dependencies.  Once all services report healthy, navigate to <http://localhost:8080> in your browser.

3. **Register and log in** via the web UI.  Use the sign‑up form to create an account; then log in to access the machines.  From the “Play Machine” tab you can select a host, inspect its status, run safe commands and toggle simulated vulnerabilities via the UI.

4. **Check logs and metrics**: Embedded Grafana dashboards are available under the Logs & Metrics tabs in the web UI.  They show Prometheus metrics and Loki logs from each service.

## Development Notes

* The project uses unpinned versions of Node 18 and Python 3.11 in the images.  Pinning package versions in the `Dockerfile`s and `requirements.txt` ensures reproducible builds.  Feel free to update versions in your own fork but ensure compatibility.
* The Next.js app relies on the **App Router** and TypeScript.  Because server components cannot import client‑only libraries (like Framer Motion or D3), we apply `'use client'` at the top of files that need them.
* The FastAPI backend uses [SQLModel](https://sqlmodel.tiangolo.com/) for declarative models.  When upgrading SQLModel above `0.0.8` you should also upgrade SQLAlchemy to `2.x` and adjust code accordingly.
* Healthchecks are defined for every container so that the dependency ordering in `docker-compose.yml` works correctly.  If a service remains in `starting` or `unhealthy` status, check the logs with `docker compose logs <service>`.

## License

This project is provided for educational purposes.  All components are delivered without warranty.  See `SAFETY.md` for details.