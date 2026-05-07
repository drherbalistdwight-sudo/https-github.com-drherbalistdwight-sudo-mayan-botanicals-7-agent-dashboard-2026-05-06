const { randomUUID } = require("node:crypto");

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "";
const ANTHROPIC_ENDPOINT = process.env.ANTHROPIC_ENDPOINT || "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";

const GHL_INBOUND_WEBHOOK_URL = process.env.GHL_INBOUND_WEBHOOK_URL || "";
const GHL_API_TOKEN = process.env.GHL_API_TOKEN || "";
const RETELL_API_KEY = process.env.RETELL_API_KEY || "";

const jobs = new Map();
const retellEvents = [];

const AGENT_META = {
  support: { name: "Mayan Support Agent" },
  voice_reception: { name: "Mayan Voice Reception Agent" },
  concierge: { name: "Mayan Concierge Agent" },
  protocol_designer: { name: "Mayan Protocol Designer Agent" },
  nurture: { name: "Mayan Nurture Agent" },
  operations: { name: "Mayan Operations Agent" },
  team_mentor: { name: "Mayan Team Mentor Agent" }
};

function nowIso() {
  return new Date().toISOString();
}

function safeString(value, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function json(res, status, payload) {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.json(payload);
}

function providerMode() {
  return CLAUDE_API_KEY ? "anthropic" : "mock";
}

function integrationModes() {
  return {
    ghlWebhook: GHL_INBOUND_WEBHOOK_URL ? "enabled" : "disabled",
    ghlDirectApi: GHL_API_TOKEN ? "enabled" : "disabled",
    retell: RETELL_API_KEY ? "enabled" : "disabled"
  };
}

function mockReport(agentId) {
  const agentName = AGENT_META[agentId]?.name || "Mayan Agent";
  return {
    title: `${agentName} Run`,
    subtitle: "serverless execution",
    summary: "Run completed in Vercel serverless mode.",
    bullets: [
      "Inputs accepted from dashboard request.",
      "Safety/brand guardrails preserved in output style.",
      "Report generated and returned immediately."
    ],
    kpis: [
      { key: "Mode", value: providerMode() },
      { key: "Platform", value: "Vercel Functions" },
      { key: "Completion", value: "Immediate" }
    ]
  };
}

async function runAnthropic(agentId, payload) {
  const agentName = AGENT_META[agentId]?.name || "Mayan Agent";
  const prompt = [
    `You are ${agentName}.`,
    "Generate strict JSON only with keys: title, subtitle, summary, bullets, kpis.",
    "bullets must be an array of short strings.",
    "kpis must be an array of objects with keys key and value.",
    `Context: ${JSON.stringify(payload).slice(0, 4000)}`
  ].join("\n");

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text || "";
  const parsed = JSON.parse(text);
  return {
    report: parsed,
    requestId: response.headers.get("request-id") || null
  };
}

async function handleRun(req, res) {
  const body = typeof req.body === "object" && req.body ? req.body : {};
  const agentId = safeString(body.agentId);

  if (!AGENT_META[agentId]) {
    json(res, 400, { error: "Unknown agentId" });
    return;
  }

  const jobId = randomUUID();
  const provider = providerMode();
  const createdAt = nowIso();

  try {
    let report = mockReport(agentId);
    let requestId = null;
    if (provider === "anthropic") {
      const runtime = await runAnthropic(agentId, body);
      report = runtime.report || report;
      requestId = runtime.requestId;
    }

    const job = {
      jobId,
      agentId,
      status: "completed",
      provider,
      model: provider === "anthropic" ? CLAUDE_MODEL : "mock-fallback",
      requestId,
      report,
      integrations: {
        ghlWebhook: { status: GHL_INBOUND_WEBHOOK_URL ? "configured" : "disabled" },
        ghlDirect: { status: GHL_API_TOKEN ? "configured" : "disabled" },
        retell: { status: RETELL_API_KEY ? "configured" : "disabled" }
      },
      createdAt,
      updatedAt: nowIso()
    };

    jobs.set(jobId, job);
    json(res, 200, job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed";
    const failed = {
      jobId,
      agentId,
      status: "failed",
      provider,
      model: provider === "anthropic" ? CLAUDE_MODEL : "mock-fallback",
      requestId: null,
      report: null,
      integrations: null,
      error: message,
      createdAt,
      updatedAt: nowIso()
    };
    jobs.set(jobId, failed);
    json(res, 500, failed);
  }
}

module.exports = async function handler(req, res) {
  const path = req.url || "/";

  if (req.method === "GET" && path === "/api/health") {
    json(res, 200, {
      ok: true,
      mode: providerMode(),
      model: CLAUDE_MODEL,
      integrations: integrationModes(),
      now: nowIso()
    });
    return;
  }

  if (req.method === "POST" && path === "/api/run") {
    await handleRun(req, res);
    return;
  }

  if (req.method === "GET" && path.startsWith("/api/status/")) {
    const jobId = decodeURIComponent(path.slice("/api/status/".length));
    const job = jobs.get(jobId);
    if (!job) {
      json(res, 404, { error: "Job not found" });
      return;
    }
    json(res, 200, job);
    return;
  }

  if (req.method === "GET" && path.startsWith("/api/report/")) {
    const jobId = decodeURIComponent(path.slice("/api/report/".length));
    const job = jobs.get(jobId);
    if (!job) {
      json(res, 404, { error: "Job not found" });
      return;
    }
    json(res, 200, job);
    return;
  }

  if (req.method === "POST" && path === "/api/retell/webhook") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    retellEvents.push({
      receivedAt: nowIso(),
      event: safeString(body?.event, "unknown"),
      callId: safeString(body?.call?.call_id),
      payload: body
    });
    if (retellEvents.length > 200) {
      retellEvents.shift();
    }
    json(res, 204, {});
    return;
  }

  if (req.method === "GET" && path === "/api/retell/events") {
    json(res, 200, {
      count: retellEvents.length,
      events: retellEvents.slice(-25)
    });
    return;
  }

  json(res, 404, { error: "Not found" });
};