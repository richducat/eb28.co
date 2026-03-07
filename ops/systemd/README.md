# Fundmanager VPS Runbook

This runbook installs the fundmanager orchestrator, public snapshot refresher, and watchdog on a Linux VPS.

## Files

- Repo checkout: `/opt/eb28.co`
- Full orchestrator state: `/var/lib/fundmanager/fundmanager-state.json`
- Public dashboard snapshot: `/var/lib/fundmanager/public/fundmanager-public.json`
- Orchestrator log: `/var/log/fundmanager/orchestrator.log`
- Public refresher log: `/var/log/fundmanager/data-refresher.log`
- Watchdog log: `/var/log/fundmanager/watchdog.log`

## Prerequisites

1. Install Python 3.
2. Clone this repo to `/opt/eb28.co`.
3. Provide a real provider plugin via environment.

The provider plugin must expose `build_provider(config)` and load its own secrets from environment variables. Do not hardcode secrets in this repo.

## Environment

Copy the example environment file and add provider-specific secrets outside git:

```bash
sudo cp /opt/eb28.co/ops/systemd/fundmanager.env.example /opt/eb28.co/ops/systemd/fundmanager.env
sudo chmod 600 /opt/eb28.co/ops/systemd/fundmanager.env
```

Set at minimum:

```bash
FUNDMANAGER_PROVIDER_MODULE=my_private_package.polymarket_provider
```

Optional:

```bash
FUNDMANAGER_WATCHDOG_RESTART_CMD=systemctl restart fundmanager-orchestrator.service
FUNDMANAGER_PUBLIC_STATE_PATH=/var/lib/fundmanager/public/fundmanager-public.json
```

## Install Units

```bash
sudo cp /opt/eb28.co/ops/systemd/fundmanager-orchestrator.service /etc/systemd/system/
sudo cp /opt/eb28.co/ops/systemd/fundmanager-data-refresher.service /etc/systemd/system/
sudo cp /opt/eb28.co/ops/systemd/fundmanager-watchdog.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fundmanager-orchestrator.service
sudo systemctl enable --now fundmanager-data-refresher.service
sudo systemctl enable --now fundmanager-watchdog.service
```

## Service Behavior

- `fundmanager-orchestrator.service`
  - Runs the live orchestrator loop every 10 minutes from config.
  - Restart policy: `Restart=always`, `RestartSec=20`.
- `fundmanager-data-refresher.service`
  - Rewrites the public-safe snapshot consumed by the dashboard.
  - Restart policy: `Restart=always`, `RestartSec=20`.
- `fundmanager-watchdog.service`
  - Checks state freshness every minute and can restart the orchestrator if configured.
  - Restart policy: `Restart=always`, `RestartSec=20`.

## Operational Commands

Check status:

```bash
sudo systemctl status fundmanager-orchestrator.service
sudo systemctl status fundmanager-data-refresher.service
sudo systemctl status fundmanager-watchdog.service
```

Tail logs:

```bash
tail -f /var/log/fundmanager/orchestrator.log
tail -f /var/log/fundmanager/data-refresher.log
tail -f /var/log/fundmanager/watchdog.log
```

Run the validation suite before enabling live provider changes:

```bash
python3 -m unittest ops.tests.test_fundmanager_runtime -v
python3 -m ops.scripts.validate_runtime
```

## Dashboard Wiring

There are two safe ways to feed `eb28.co/fundmanager`:

1. Same host:
   - Set the web runtime to read `FUNDMANAGER_PUBLIC_STATE_PATH=/var/lib/fundmanager/public/fundmanager-public.json`.
2. Separate web host:
   - Publish `/var/lib/fundmanager/public/fundmanager-public.json` over HTTPS from the VPS.
   - Set `FUNDMANAGER_PUBLIC_STATE_URL=https://your-host.example/fundmanager-public.json` in the API runtime.
   - If the frontend is shipped as pure static assets without a server-side API runtime, set `VITE_FUNDMANAGER_PUBLIC_STATE_URL=https://your-host.example/fundmanager-public.json` at build time.

If the dashboard cannot read a fresh snapshot, it will show `OFFLINE` or `STALE` instead of pretending lanes are healthy.
