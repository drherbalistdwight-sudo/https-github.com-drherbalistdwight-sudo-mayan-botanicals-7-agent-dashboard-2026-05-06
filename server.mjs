import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const APP_ROOT = __dirname;

const ANTHROPIC_ENDPOINT = process.env.ANTHROPIC_ENDPOINT || "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "";
const AGENT_WEBHOOK_URL = process.env.AGENT_WEBHOOK_URL || "";

const GHL_INBOUND_WEBHOOK_URL = process.env.GHL_INBOUND_WEBHOOK_URL || "";
const GHL_WEBHOOK_BEARER_TOKEN = process.env.GHL_WEBHOOK_BEARER_TOKEN || "";
const GHL_API_BASE = process.env.GHL_API_BASE || "https://services.leadconnectorhq.com";
const GHL_API_TOKEN = process.env.GHL_API_TOKEN || "";
const GHL_API_VERSION = process.env.GHL_API_VERSION || "2021-07-28";
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || "";

const RETELL_API_BASE = process.env.RETELL_API_BASE || "https://api.retellai.com";
const RETELL_API_KEY = process.env.RETELL_API_KEY || "";
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID || "";
const RETELL_FROM_NUMBER = process.env.RETELL_FROM_NUMBER || "";

const JOB_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 1024 * 1024;

const AGENTS = {
  support: {
    id: "support",
    name: "Mayan Support Agent",
    objective: "Handle inbound support intents and route each contact to the safest next action.",
    reportFallback: {
      title: "Support Agent Run",
      subtitle: "triage + support routing",
      summary: "Support intents were triaged, high-risk messages were flagged, and standard intents were routed to booking or operations.",
      bullets: [
        "Emergency and medication-safety language was marked for immediate human escalation.",
        "Low-risk known questions were answered with concise educational framing.",
        "Each interaction was tagged with next action and owner for CRM handoff."
      ],
      kpis: [
        { key: "Escalation Coverage", value: "100%" },
        { key: "Average First Reply", value: "< 2 min" },
        { key: "Routing Accuracy", value: "High" }
      ]
    }
  },
  voice_reception: {
    id: "voice_reception",
    name: "Mayan Voice Reception Agent",
    objective: "Run voice workflows for booking, reschedules, support follow-up, and no-show recovery.",
    reportFallback: {
      title: "Voice Reception Run",
      subtitle: "call workflow execution",
      summary: "Voice disposition paths were processed and unresolved calls were assigned callback owners with SLA.",
      bullets: [
        "Caller purpose was classified before action handling.",
        "In-call completion was prioritized for booking and reschedules.",
        "Unresolved calls were assigned for follow-up with timestamped SLA."
      ],
      kpis: [
        { key: "Disposition Logged", value: "Yes" },
        { key: "Callback SLA", value: "Set" },
        { key: "Safety Transfer", value: "Enabled" }
      ]
    }
  },
  concierge: {
    id: "concierge",
    name: "Mayan Concierge Agent",
    objective: "Recommend the best next path and push each contact toward one clear commitment.",
    reportFallback: {
      title: "Concierge Agent Run",
      subtitle: "path recommendation",
      summary: "Contacts were matched to assessment, consult, or protocol paths with rationale and confidence scoring.",
      bullets: [
        "Goals, urgency, and complexity were used to select one primary path.",
        "Only one to two options were presented to prevent decision fatigue.",
        "Opportunity stage updates were prepared for CRM synchronization."
      ],
      kpis: [
        { key: "Path Confidence", value: "0.80+" },
        { key: "Next Step Clarity", value: "High" },
        { key: "Escalation Safety", value: "On" }
      ]
    }
  },
  protocol_designer: {
    id: "protocol_designer",
    name: "Mayan Protocol Designer Agent",
    objective: "Draft structured protocol briefs and route all final decisions through practitioner review.",
    reportFallback: {
      title: "Protocol Designer Run",
      subtitle: "draft protocol brief",
      summary: "A structured draft brief was generated with routine sequencing and risk points for practitioner review.",
      bullets: [
        "Goal and routine constraints were mapped into morning, midday, and evening windows.",
        "Adherence risks and check-in cadence were documented.",
        "Medication conflict signals were flagged for mandatory human review."
      ],
      kpis: [
        { key: "Practitioner Gate", value: "Required" },
        { key: "Adherence Plan", value: "Included" },
        { key: "Safety Flags", value: "Captured" }
      ]
    }
  },
  nurture: {
    id: "nurture",
    name: "Mayan Nurture Agent",
    objective: "Recover stalled leads through short personalized follow-up with strict cadence controls.",
    reportFallback: {
      title: "Nurture Agent Run",
      subtitle: "stalled lead recovery",
      summary: "Stall reasons were classified and branch-specific follow-up messages were prepared for SMS/email delivery.",
      bullets: [
        "Each contact was mapped to the correct branch before message generation.",
        "Messages used one clear CTA and low-friction language.",
        "Negative sentiment and compliance risk paths were escalated to human owner."
      ],
      kpis: [
        { key: "Branch Match", value: "High" },
        { key: "Cadence Caps", value: "Enforced" },
        { key: "Warm Reply Escalation", value: "Same day" }
      ]
    }
  },
  operations: {
    id: "operations",
    name: "Mayan Operations Agent",
    objective: "Detect fulfillment and payment exceptions and ensure every case has owner, deadline, and client-safe communication.",
    reportFallback: {
      title: "Operations Agent Run",
      subtitle: "exception control",
      summary: "Order data checks were run and exceptions were routed with explicit owner and timing requirements.",
      bullets: [
        "Payment, inventory, and shipping exceptions were validated against SLA rules.",
        "Customer-safe notifications were prepared for delay or failure events.",
        "No silent failure rule enforced with owner + due-time assignment."
      ],
      kpis: [
        { key: "Exception Coverage", value: "100%" },
        { key: "Payment SLA", value: "2h" },
        { key: "Delay Notice SLA", value: "6h" }
      ]
    }
  },
  team_mentor: {
    id: "team_mentor",
    name: "Mayan Team Mentor Agent",
    objective: "Produce daily coaching insight from real conversations while tracking compliance and clarity quality.",
    reportFallback: {
      title: "Team Mentor Run",
      subtitle: "daily coaching loop",
      summary: "Conversation samples were scored and one concrete improvement action was assigned per team member.",
      bullets: [
        "Scoring covered clarity, empathy, next-step precision, and compliance safety.",
        "Coaching notes focused on behavior examples instead of personality critique.",
        "Repeated risk patterns were flagged early for manager review."
      ],
      kpis: [
        { key: "Scorecard Coverage", value: "Daily" },
        { key: "Action Per Rep", value: "1" },
        { key: "Risk Flags", value: "Tracked" }
      ]
    }
  }
};

const jobs = new Map();
const retellEvents = [];

function nowIso() {
  return new Date().toISOString();
}

function safeString(value, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function pickAgent(agentId) {
  return AGENTS[agentId] || null;
}

function providerMode() {
  if (CLAUDE_API_KEY) {
    return "anthropic";
  }
  if (AGENT_WEBHOOK_URL) {
    return "webhook";
  }
  return "mock";
}

function integrationModes() {
  return {
    ghlWebhook: GHL_INBOUND_WEBHOOK_URL ? "enabled" : "disabled",
    ghlDirectApi: GHL_API_TOKEN ? "enabled" : "disabled",
    retell: RETELL_API_KEY ? "enabled" : "disabled"
  };
}

function extractFirstJsonObject(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty model output");
  }
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("No JSON object found in model output");
    }
    return JSON.parse(text.slice(first, last + 1));
  }
}

function normalizeReport(agent, input) {
  const fallback = agent.reportFallback;
  const report = input && typeof input === "object" ? input : {};

  const title = safeString(report.title, fallback.title);
  const subtitle = safeString(report.subtitle, fallback.subtitle);
  const summary = safeString(report.summary, fallback.summary);

  const bullets = Array.isArray(report.bullets)
    ? report.bullets.map((item) => safeString(item)).filter(Boolean).slice(0, 5)
    : [];

  const kpis = Array.isArray(report.kpis)
    ? report.kpis
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const key = safeString(item.key);
        const value = safeString(item.value);
        if (!key || !value) {
          return null;
        }
        return { key, value };
      })
      .filter(Boolean)
      .slice(0, 4)
    : [];

  return {
    title,
    subtitle,
    summary,
    bullets: bullets.length ? bullets : fallback.bullets,
    kpis: kpis.length ? kpis : fallback.kpis
  };
}

function buildUserPrompt(agent, payload) {
  const brandName = safeString(payload?.brand?.name, "Mayan Botanicals");
  const audience = safeString(payload?.brand?.audience, "wellness clients and internal care team");
  const operator = safeString(payload?.brand?.operator, "DocTA Team");
  const additionalContext = safeString(payload?.context, "");

  const contactContext = payload?.contact && typeof payload.contact === "object"
    ? JSON.stringify(payload.contact)
    : "none";

  return [
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    `Brand: ${brandName}`,
    `Audience: ${audience}`,
    `Operator: ${operator}`,
    `Agent: ${agent.name}`,
    `Objective: ${agent.objective}`,
    `Contact Context: ${contactContext}`,
    additionalContext ? `Additional Context: ${additionalContext}` : "",
    "You must follow these safety requirements:",
    "- Educational wellness support only.",
    "- Never diagnose or prescribe treatment.",
    "- Never promise guaranteed outcomes.",
    "Return ONLY valid JSON with this exact schema:",
    "{",
    '  "title": "string",',
    '  "subtitle": "string",',
    '  "summary": "string",',
    '  "bullets": ["string", "string", "string"],',
    '  "kpis": [{"key":"string","value":"string"}, {"key":"string","value":"string"}, {"key":"string","value":"string"}]',
    "}",
    "No markdown. No extra keys. Keep concise and execution-ready."
  ].filter(Boolean).join("\n");
}

async function runAnthropic(agent, payload) {
  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: 1200,
    temperature: 0.35,
    system: "You are a senior operations architect for a wellness business dashboard. Follow all constraints exactly and produce strict JSON only.",
    messages: [
      {
        role: "user",
        content: buildUserPrompt(agent, payload)
      }
    ]
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    const requestId = response.headers.get("request-id") || undefined;
    const raw = await response.text();

    if (!response.ok) {
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.error?.message || parsed?.message || raw;
      } catch {
        // keep raw
      }
      throw new Error(`Anthropic API error (${response.status}): ${message}`);
    }

    const parsed = JSON.parse(raw);
    const text = Array.isArray(parsed.content)
      ? parsed.content
        .filter((block) => block && block.type === "text")
        .map((block) => block.text || "")
        .join("\n")
      : "";

    const reportObject = extractFirstJsonObject(text);

    return {
      provider: "anthropic",
      model: parsed.model || CLAUDE_MODEL,
      requestId,
      report: normalizeReport(agent, reportObject)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runWebhook(agent, payload) {
  const response = await fetch(AGENT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      agent,
      payload,
      requestedAt: nowIso()
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook error (${response.status}): ${raw}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Webhook returned non-JSON response");
  }

  return {
    provider: "webhook",
    model: safeString(parsed.model, "external"),
    requestId: safeString(parsed.requestId) || undefined,
    report: normalizeReport(agent, parsed.report || parsed)
  };
}

async function runMock(agent) {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return {
    provider: "mock",
    model: "mock-runtime",
    requestId: undefined,
    report: normalizeReport(agent, agent.reportFallback)
  };
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data: parsed,
    raw: text
  };
}

async function forwardToGhlWebhook(agent, payload, report, jobId) {
  if (!GHL_INBOUND_WEBHOOK_URL) {
    return { status: "skipped", reason: "GHL_INBOUND_WEBHOOK_URL not set" };
  }

  const headers = {};
  if (GHL_WEBHOOK_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${GHL_WEBHOOK_BEARER_TOKEN}`;
  }

  const result = await postJson(
    GHL_INBOUND_WEBHOOK_URL,
    {
      event: "mayan_agent_run",
      timestamp: nowIso(),
      source: "mayan-botanicals-dashboard",
      jobId,
      agentId: agent.id,
      agentName: agent.name,
      report,
      contact: payload?.contact || null,
      context: safeString(payload?.context, "")
    },
    headers
  );

  if (!result.ok) {
    return {
      status: "failed",
      reason: `Webhook status ${result.status}`,
      response: result.raw.slice(0, 2000)
    };
  }

  return {
    status: "sent",
    statusCode: result.status
  };
}

function contactForUpsert(payload) {
  const contact = payload?.contact;
  if (!contact || typeof contact !== "object") {
    return null;
  }

  const email = safeString(contact.email);
  const phone = safeString(contact.phone);
  if (!email && !phone) {
    return null;
  }

  return {
    firstName: safeString(contact.firstName),
    lastName: safeString(contact.lastName),
    name: safeString(contact.name),
    email,
    phone,
    tags: Array.isArray(contact.tags)
      ? contact.tags.map((tag) => safeString(tag)).filter(Boolean)
      : []
  };
}

async function upsertGhlContactAndNote(agent, payload, report, jobId) {
  if (!GHL_API_TOKEN) {
    return { status: "skipped", reason: "GHL_API_TOKEN not set" };
  }

  const contact = contactForUpsert(payload);
  if (!contact) {
    return { status: "skipped", reason: "No email/phone provided in payload.contact" };
  }

  const upsertBody = {
    locationId: GHL_LOCATION_ID || undefined,
    firstName: contact.firstName || undefined,
    lastName: contact.lastName || undefined,
    name: contact.name || undefined,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    tags: [...new Set([...contact.tags, `mb-agent:${agent.id}`])]
  };

  const upsert = await postJson(
    `${GHL_API_BASE.replace(/\/$/, "")}/contacts/upsert`,
    upsertBody,
    {
      Authorization: `Bearer ${GHL_API_TOKEN}`,
      Version: GHL_API_VERSION
    }
  );

  if (!upsert.ok) {
    return {
      status: "failed",
      phase: "upsert",
      reason: `Upsert status ${upsert.status}`,
      response: upsert.raw.slice(0, 2000)
    };
  }

  const contactId =
    upsert?.data?.contact?.id ||
    upsert?.data?.id ||
    upsert?.data?.contactId ||
    "";

  if (!contactId) {
    return {
      status: "partial",
      phase: "upsert",
      reason: "Contact upserted but contact id not found in response"
    };
  }

  const noteBody = {
    body: [
      `[${nowIso()}] ${agent.name} run completed`,
      `Job ID: ${jobId}`,
      `Summary: ${safeString(report.summary)}`,
      `Top KPI: ${report.kpis?.[0] ? `${report.kpis[0].key}=${report.kpis[0].value}` : "n/a"}`
    ].join("\n")
  };

  const note = await postJson(
    `${GHL_API_BASE.replace(/\/$/, "")}/contacts/${encodeURIComponent(contactId)}/notes`,
    noteBody,
    {
      Authorization: `Bearer ${GHL_API_TOKEN}`,
      Version: GHL_API_VERSION
    }
  );

  if (!note.ok) {
    return {
      status: "partial",
      phase: "note",
      reason: `Contact upserted but note failed (${note.status})`,
      contactId,
      response: note.raw.slice(0, 2000)
    };
  }

  return {
    status: "sent",
    contactId,
    upsertStatus: upsert.status,
    noteStatus: note.status
  };
}

function buildRetellMetadata(agent, payload, jobId) {
  const contact = payload?.contact || {};
  return {
    job_id: jobId,
    agent_id: agent.id,
    agent_name: agent.name,
    contact_email: safeString(contact.email),
    contact_phone: safeString(contact.phone)
  };
}

async function triggerRetellVoice(agent, payload, jobId) {
  if (agent.id !== "voice_reception") {
    return { status: "not_applicable" };
  }

  if (!RETELL_API_KEY) {
    return { status: "skipped", reason: "RETELL_API_KEY not set" };
  }

  const toNumber = safeString(payload?.voice?.toNumber || payload?.contact?.phone);
  const fromNumber = safeString(payload?.voice?.fromNumber || RETELL_FROM_NUMBER);

  const headers = {
    Authorization: `Bearer ${RETELL_API_KEY}`,
    "content-type": "application/json"
  };

  if (toNumber && fromNumber) {
    const phoneCall = await postJson(
      `${RETELL_API_BASE.replace(/\/$/, "")}/v2/create-phone-call`,
      {
        from_number: fromNumber,
        to_number: toNumber,
        override_agent_id: RETELL_AGENT_ID || undefined,
        metadata: buildRetellMetadata(agent, payload, jobId)
      },
      headers
    );

    if (!phoneCall.ok) {
      return {
        status: "failed",
        mode: "phone_call",
        reason: `Retell status ${phoneCall.status}`,
        response: phoneCall.raw.slice(0, 2000)
      };
    }

    return {
      status: "sent",
      mode: "phone_call",
      callId: safeString(phoneCall?.data?.call_id),
      callStatus: safeString(phoneCall?.data?.call_status)
    };
  }

  if (!RETELL_AGENT_ID) {
    return {
      status: "skipped",
      reason: "No phone path available (missing to/from) and RETELL_AGENT_ID not set for web call"
    };
  }

  const webCall = await postJson(
    `${RETELL_API_BASE.replace(/\/$/, "")}/v2/create-web-call`,
    {
      agent_id: RETELL_AGENT_ID,
      metadata: buildRetellMetadata(agent, payload, jobId)
    },
    headers
  );

  if (!webCall.ok) {
    return {
      status: "failed",
      mode: "web_call",
      reason: `Retell status ${webCall.status}`,
      response: webCall.raw.slice(0, 2000)
    };
  }

  return {
    status: "sent",
    mode: "web_call",
    callId: safeString(webCall?.data?.call_id),
    callStatus: safeString(webCall?.data?.call_status),
    hasAccessToken: Boolean(webCall?.data?.access_token)
  };
}

async function runIntegrations(agent, payload, report, jobId) {
  const [ghlWebhook, ghlDirect, retell] = await Promise.all([
    forwardToGhlWebhook(agent, payload, report, jobId).catch((error) => ({
      status: "failed",
      reason: error instanceof Error ? error.message : "Unknown GHL webhook error"
    })),
    upsertGhlContactAndNote(agent, payload, report, jobId).catch((error) => ({
      status: "failed",
      reason: error instanceof Error ? error.message : "Unknown GHL API error"
    })),
    triggerRetellVoice(agent, payload, jobId).catch((error) => ({
      status: "failed",
      reason: error instanceof Error ? error.message : "Unknown Retell error"
    }))
  ]);

  return { ghlWebhook, ghlDirect, retell };
}

function jobPublicState(job) {
  return {
    jobId: job.jobId,
    agentId: job.agentId,
    status: job.status,
    provider: job.provider,
    model: job.model,
    requestId: job.requestId,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

async function executeJob(jobId, payload) {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  job.status = "running";
  job.updatedAt = nowIso();

  try {
    const agent = pickAgent(job.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const mode = providerMode();
    let runtime;

    if (mode === "anthropic") {
      runtime = await runAnthropic(agent, payload);
    } else if (mode === "webhook") {
      runtime = await runWebhook(agent, payload);
    } else {
      runtime = await runMock(agent);
    }

    const integrations = await runIntegrations(agent, payload, runtime.report, jobId);

    job.status = "completed";
    job.provider = runtime.provider;
    job.model = runtime.model;
    job.requestId = runtime.requestId;
    job.report = runtime.report;
    job.integrations = integrations;
    job.error = undefined;
    job.updatedAt = nowIso();
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown runtime error";
    job.updatedAt = nowIso();
  }
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      mode: providerMode(),
      model: CLAUDE_MODEL,
      integrations: integrationModes(),
      now: nowIso()
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/run") {
    let body;
    try {
      body = await parseRequestBody(req);
    } catch (error) {
      json(res, 400, { error: error.message });
      return;
    }

    const agentId = safeString(body.agentId);
    const agent = pickAgent(agentId);

    if (!agent) {
      json(res, 400, { error: "Unknown agentId" });
      return;
    }

    const jobId = randomUUID();
    const job = {
      jobId,
      agentId,
      status: "queued",
      provider: providerMode(),
      model: providerMode() === "anthropic" ? CLAUDE_MODEL : undefined,
      requestId: undefined,
      report: undefined,
      integrations: undefined,
      error: undefined,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    jobs.set(jobId, job);
    void executeJob(jobId, body);

    json(res, 202, {
      jobId,
      status: job.status,
      agentId: job.agentId,
      provider: job.provider
    });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/status/")) {
    const jobId = decodeURIComponent(pathname.slice("/api/status/".length));
    const job = jobs.get(jobId);
    if (!job) {
      json(res, 404, { error: "Job not found" });
      return;
    }

    json(res, 200, jobPublicState(job));
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/report/")) {
    const jobId = decodeURIComponent(pathname.slice("/api/report/".length));
    const job = jobs.get(jobId);
    if (!job) {
      json(res, 404, { error: "Job not found" });
      return;
    }

    json(res, 200, {
      ...jobPublicState(job),
      report: job.report || null,
      integrations: job.integrations || null
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/retell/webhook") {
    let body;
    try {
      body = await parseRequestBody(req);
    } catch (error) {
      json(res, 400, { error: error.message });
      return;
    }

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

  if (req.method === "GET" && pathname === "/api/retell/events") {
    json(res, 200, {
      count: retellEvents.length,
      events: retellEvents.slice(-25)
    });
    return;
  }

  notFound(res);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function serveStatic(req, res, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path
    .normalize(decodeURIComponent(requestPath))
    .replace(/^([/\\])+/, "")
    .replace(/^\.+[\\/]/, "");
  const filePath = path.join(APP_ROOT, normalized);

  if (!filePath.startsWith(APP_ROOT)) {
    notFound(res);
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      const indexFile = path.join(filePath, "index.html");
      const indexContent = await fs.readFile(indexFile);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(indexContent);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(filePath);

    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": ext === ".png" || ext === ".jpg" || ext === ".jpeg" ? "public, max-age=3600" : "no-store"
    });
    res.end(content);
  } catch {
    notFound(res);
  }
}

setInterval(() => {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [jobId, job] of jobs.entries()) {
    const ts = Date.parse(job.updatedAt || job.createdAt);
    if (!Number.isFinite(ts) || ts < cutoff) {
      jobs.delete(jobId);
    }
  }
}, 15 * 60 * 1000).unref();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mayan dashboard server listening on http://${HOST}:${PORT}`);
  console.log(`Runtime mode: ${providerMode()}${providerMode() === "anthropic" ? ` · model: ${CLAUDE_MODEL}` : ""}`);
  console.log(`Integrations: ${JSON.stringify(integrationModes())}`);
});
