# Runbook: Publish Live On mayanbotanicals.com

## 1. Deploy runtime at `ops.mayanbotanicals.com`

Host this folder on a Node-capable host (VPS, Railway, Render, Fly, etc.):

`/Users/docta/Documents/New project/outputs/mayan-botanicals-7-agent-dashboard-2026-05-06`

Commands on server:

```bash
npm install --omit=dev
cp .env.example .env
# fill values
npm start
```

Use a process manager for production (`pm2`/systemd).

## 2. DNS

Create DNS record:

- Type: `A` or `CNAME`
- Host: `ops`
- Value: your runtime host

Confirm `https://ops.mayanbotanicals.com/api/health` returns JSON.

## 3. TLS and reverse proxy

Terminate TLS at your proxy/load balancer.

Required proxy behavior:

- pass through `POST` and `GET` for `/api/*`
- do not cache API responses
- allow payload up to at least 1MB

## 4. Environment variables

Minimum Claude runtime:

- `CLAUDE_API_KEY`
- `CLAUDE_MODEL` (default already set)

GoHighLevel recommended:

- `GHL_INBOUND_WEBHOOK_URL`
- `GHL_WEBHOOK_BEARER_TOKEN` (optional)

GoHighLevel direct API optional:

- `GHL_API_TOKEN`
- `GHL_LOCATION_ID`

Retell:

- `RETELL_API_KEY`
- `RETELL_AGENT_ID`
- `RETELL_FROM_NUMBER` (optional, required for direct phone call mode)

## 5. Wire GoHighLevel

In HighLevel:

1. Create workflow trigger: **Inbound Webhook**
2. Copy trigger URL into `GHL_INBOUND_WEBHOOK_URL`
3. Map fields from payload:
   - `agentId`
   - `agentName`
   - `jobId`
   - `report.summary`
   - `contact.email` / `contact.phone` (if sent)
4. Continue workflow into tag update, owner assignment, or notifications.

## 6. Wire Retell

Set Retell webhook URL to:

`https://ops.mayanbotanicals.com/api/retell/webhook`

This endpoint stores recent webhook events in-memory for quick diagnostics:

- `GET /api/retell/events`

## 7. Embed into WordPress page

On `mayanbotanicals.com`:

1. Create a page (example slug: `ai-dashboard`)
2. Add a **Custom HTML** block
3. Paste `deployment/wordpress-page-snippet.html`
4. Publish and add to menu if needed

## 8. Smoke test checklist

- `GET /api/health` shows correct mode and integrations
- open dashboard and run each agent once
- confirm `report` appears in modal
- confirm GHL inbound workflow execution logs received payload
- run Voice Reception and confirm Retell call/web-call was created
