# WinCVEx User Guide

Welcome to the WinCVEx cyber‑lab!  This guide walks you through using the web interface to interact with the simulated environment.

## 1. Accessing the Lab

After starting the lab with `docker compose up --build` you can access the web interface at <http://localhost:8080>.  The landing page displays an animated network map of the simulated domain controller and two hosts.

## 2. Creating an Account

1. Click the **Sign Up** button on the landing page.
2. Fill in a username and a password.  The lab does not enforce strong password rules but we recommend using a long passphrase.
3. Submit the form.  On success you will be redirected to the login page.

## 3. Logging In

1. On the login page enter the credentials you used when signing up.
2. Submit the form.  A successful login stores a short‑lived JWT in your browser’s local storage and redirects you to the **Play Machine** interface.
3. If you forget your username or password you must recreate your account by removing the Postgres volume (`postgres_data`) and restarting the lab.

## 4. Exploring the Machines

The **Play Machine** interface shows three panes:

* **Machines** (left) – A list of available hosts: `wincvex-dc`, `wincvex-host-b` and `wincvex-host-c`.  Click a machine to select it.
* **Vulnerabilities** (middle) – For the selected machine this panel lists four simulated mis‑configurations: weak SMB signing, anonymous LDAP binds, outdated packages and an open firewall port.  Each vulnerability has a button to enable or disable it.  Enabling a vulnerability simulates a mis‑configuration that you can then remediate by disabling it.
* **Terminal** (right) – A jailed command shell connected to the selected machine.  You can execute only a handful of safe commands:
  * `ls` – lists files in the current directory.
  * `whoami` – prints the user name.
  * `uptime` – shows how long the container has been running.
  * `date` – displays the current date and time.
  * `cat_os` – dumps the `/etc/os‑release` file.

Type a command and press **Run** to see its output.  Attempting to run any other command will produce an error.

## 5. Viewing Logs and Metrics

At the bottom of the **Play Machine** page is a panel titled **Logs & Metrics**.  It embeds Grafana dashboards using an iframe.  You can explore container logs through the Loki interface and view Prometheus metrics for the running services.  Grafana is configured with anonymous access so you do not need separate credentials.

## 6. Completing a Mission

Your objective is to harden each machine by disabling all four simulated vulnerabilities.  Use the buttons in the **Vulnerabilities** panel to toggle each mis‑configuration off.  There is no hidden scoring system – once all flags are disabled on all hosts you have effectively completed the mission.  Feel free to re‑enable flags and experiment with different states.

### Notes

- There is no real Windows software running in this lab; everything is simulated using Linux containers.
- The terminal restricts commands to prevent abuse.  The allow‑list is hardcoded in each agent container.  Commands like `sudo`, `curl` or `ssh` will be rejected.
- Log streaming over WebSockets is simulated and does not reflect actual activity.  The intention is to show how you might wire up real‑time log feeds in a more complex lab.