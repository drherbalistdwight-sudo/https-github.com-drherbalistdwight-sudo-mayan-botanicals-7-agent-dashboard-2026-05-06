# Mayan Botanicals 7-Agent Dashboard (Live Runtime)

This build is ready to run with:

- Claude (Anthropic Messages API)
- GoHighLevel (inbound webhook and optional direct API)
- Retell AI (voice/web call trigger for Voice Reception agent)

## Folder

`/Users/docta/Documents/New project/outputs/mayan-botanicals-7-agent-dashboard-2026-05-06`

## Start Local

```bash
cd "/Users/docta/Documents/New project/outputs/mayan-botanicals-7-agent-dashboard-2026-05-06"
cp .env.example .env
# fill in keys
set -a; source .env; set +a
npm start
```

Open: `http://127.0.0.1:8080`

## API Endpoints

- `GET /api/health`
- `POST /api/run`
- `GET /api/status/:jobId`
- `GET /api/report/:jobId`
- `POST /api/retell/webhook`
- `GET /api/retell/events`

## Runtime Modes

1. `anthropic` when `CLAUDE_API_KEY` is set
2. `webhook` when `AGENT_WEBHOOK_URL` is set and Claude key is empty
3. `mock` when neither is set

## GoHighLevel Wiring

Recommended:

- set `GHL_INBOUND_WEBHOOK_URL` to a HighLevel Inbound Webhook Trigger URL
- optional bearer auth via `GHL_WEBHOOK_BEARER_TOKEN`

Optional direct API mode:

- set `GHL_API_TOKEN`
- set `GHL_LOCATION_ID`
- dashboard will attempt contact upsert + note write on agent runs (when contact email/phone is provided)

## Retell Wiring

- set `RETELL_API_KEY`
- set `RETELL_AGENT_ID`
- optional `RETELL_FROM_NUMBER` for direct phone outbound

Behavior:

- Voice Reception agent attempts phone call if `toNumber` + `fromNumber` are present
- otherwise it attempts `create-web-call` using `RETELL_AGENT_ID`

## Publish on mayanbotanicals.com

Use the deployment runbook:

- `deployment/runbook-mayanbotanicals.md`
- `deployment/wordpress-page-snippet.html`
