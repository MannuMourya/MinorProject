# Safety Notice

WinCVEx is a **training‑only** environment.  The simulated vulnerability scenarios implemented in the lab do **not** expose any actual CVEs or exploitable weaknesses.  Instead, the agent containers maintain in‑memory flags to represent mis‑configurations (for example “weak SMB signing” or “anonymous LDAP binds”) and respond accordingly when queried.

## Design Principles

1. **Local‑only deployment** – The lab runs entirely on your machine and never exposes ports to the internet.  By default only the reverse proxy listens on `localhost:8080`.  All inter‑service communication occurs over the Docker internal network.
2. **Unprivileged containers** – None of the containers run with escalated privileges or mount host directories except for volume mounts required by Prometheus/Grafana/Loki.  The simulated hosts run as non‑root users inside their containers.
3. **Jailed terminal** – The terminal provided in the web UI is restricted to a small allow‑list of safe commands (e.g. `ls`, `whoami`, `uptime`, `cat /etc/os-release`).  Arbitrary shell execution is blocked.
4. **Rate limiting** – Authentication and state‑changing API endpoints include a minimal rate limiter to discourage brute‑force attacks.  In a production environment you should use a more robust solution (e.g. Nginx `limit_req` or a dedicated rate‑limiting service).
5. **Audit logging** – User actions such as login, toggling vulnerabilities and executing terminal commands are logged to stdout and forwarded to Loki via promtail.  These logs are only accessible to you through the embedded Grafana dashboards.

## No Real Vulnerabilities

While the lab refers to well‑known mis‑configurations in Windows networks, **no genuine vulnerabilities are present**.  The domain controller and hosts are plain Linux containers with no real SMB, LDAP, or firewall services running.  The “outdated package” scenario flips a flag rather than installing old software.  This ensures that participants can practice detection and mitigation techniques without risking compromise.

## Responsible Use

This lab is intended solely for educational use by individuals learning about cyber defence.  Do not expose it to untrusted networks or use it as a basis for offensive operations.  If you identify any issues that could lead to misuse, please report them by opening an issue in the repository.