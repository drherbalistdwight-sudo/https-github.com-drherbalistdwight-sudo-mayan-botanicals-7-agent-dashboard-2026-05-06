const API_BASE = "/api";

const BRAND_PROFILE = {
  name: "Mayan Botanicals",
  audience: "wellness clients and internal care team",
  operator: "DocTA Team"
};

const AGENTS = [
  {
    id: "support",
    index: "01",
    name: "Mayan Support Agent",
    mission:
      "Deliver fast, calm, high-context support across chat, SMS, social, and email while routing high-value opportunities to the right human owner.",
    channels: ["website chat", "Instagram/Facebook DM", "SMS", "email"],
    channelTags: ["chat", "social", "sms", "email"],
    inputs: [
      "contact profile and tags",
      "product catalog and FAQ",
      "order status and tracking data",
      "consultation availability",
      "brand voice guidelines"
    ],
    workflow: [
      "identify channel and intent",
      "check contact history and current stage",
      "answer directly if low-risk and known",
      "route to booking, concierge, or operations as needed",
      "write summary note to CRM"
    ],
    frameworkLabel: "Escalation Rules",
    frameworkItems: [
      "escalate to human immediately if message includes emergency language",
      "escalate to human for payment/refund disputes",
      "escalate to practitioner queue for contraindication or medication safety questions"
    ],
    guardrails: [
      "educational wellness support only",
      "no diagnosis or treatment claims",
      "no guaranteed outcomes language in support replies",
      "keep response warm, practical, and concise"
    ],
    sla: "Safety/payment escalation: immediate",
    outputLabel: "Output Schema",
    outputBody: `{
  "intent": "product-question",
  "priority": "normal",
  "next_action": "send_consult_booking_link",
  "owner": "sales_queue",
  "summary_note": "Asked about protocol fit and requested consult link."
}`
  },
  {
    id: "voice_reception",
    index: "02",
    name: "Mayan Voice Reception Agent",
    mission:
      "Handle inbound and outbound call workflows for consultation booking, confirmation, no-show recovery, and simple support requests.",
    channels: ["voice calls", "callback queue", "CRM logging"],
    channelTags: ["voice", "internal"],
    inputs: [
      "caller identity and CRM match",
      "open opportunities and stage",
      "appointment calendar slots",
      "service and pricing FAQ"
    ],
    workflow: [
      "greet and verify caller identity",
      "classify purpose (book, reschedule, support, order question)",
      "complete requested action in-call when possible",
      "if unresolved, assign owner and set callback SLA",
      "log disposition in CRM"
    ],
    frameworkLabel: "Disposition Codes",
    frameworkItems: ["booked", "rescheduled", "support-resolved", "support-followup", "sales-followup", "no-answer"],
    guardrails: [
      "never provide emergency or diagnostic guidance",
      "transfer to human on safety-sensitive health questions",
      "do not promise medical outcomes"
    ],
    sla: "Unresolved calls: owner + callback SLA set",
    outputLabel: "Core Script Pattern",
    outputBody: `- opening: warm greeting and clarity of purpose
- middle: direct action and confirmation
- close: next step, timeline, and thank-you`
  },
  {
    id: "concierge",
    index: "03",
    name: "Mayan Concierge Agent",
    mission:
      "Turn inquiries into personalized next steps by guiding each person to the right path: assessment, consultation, protocol package, or support.",
    channels: ["chat", "SMS", "email", "consult pipeline"],
    channelTags: ["chat", "sms", "email", "internal"],
    inputs: [
      "assessment responses",
      "consultation history",
      "product interest signals",
      "budget range and urgency indicators"
    ],
    workflow: [
      "confirm goals and current concern",
      "identify confidence level in recommended path",
      "present 1-2 best-fit options with rationale",
      "ask for commitment to next action",
      "tag and update opportunity stage"
    ],
    frameworkLabel: "Offer Paths",
    frameworkItems: ["assessment-first", "book-consult", "starter-protocol", "advanced-protocol", "support-only"],
    guardrails: [
      "keep recommendations educational and structure-focused",
      "avoid one-size-fits-all product language",
      "avoid diagnosing conditions"
    ],
    sla: "Path confidence captured before handoff",
    outputLabel: "Output Schema",
    outputBody: `{
  "recommended_path": "book-consult",
  "confidence": 0.84,
  "reason": "High intent and complex history requiring practitioner guidance",
  "next_step_url": "<booking-link>"
}`
  },
  {
    id: "protocol_designer",
    index: "04",
    name: "Mayan Protocol Designer Agent",
    mission:
      "Co-create a structured wellness protocol draft with the customer, then generate a clean practitioner-ready brief for DocTA review.",
    channels: ["consult intake", "practitioner review queue"],
    channelTags: ["internal"],
    inputs: [
      "intake responses",
      "consultation notes",
      "relevant product catalog details",
      "known contraindication flags"
    ],
    workflow: [
      "collect goal + constraint profile",
      "map routine windows (morning/midday/evening)",
      "draft product and habit sequence",
      "generate adherence plan and check-in cadence",
      "send brief to practitioner review queue"
    ],
    frameworkLabel: "Protocol Brief Template",
    frameworkItems: [],
    guardrails: [
      "practitioner approval required before final protocol release",
      "no claims of cure, reversal, or guaranteed outcomes",
      "any medication conflict signal must trigger human review"
    ],
    sla: "Final protocol requires practitioner approval",
    outputLabel: "Protocol Draft Brief",
    outputBody: `## Protocol Draft Brief
- Client goals:
- Current routine constraints:
- Proposed botanical sequence:
- Supporting habits:
- Adherence risks:
- Required practitioner review points:`
  },
  {
    id: "nurture",
    index: "05",
    name: "Mayan Nurture Agent",
    mission:
      "Recover interested but inactive leads through personalized, behavior-based follow-up across SMS and email.",
    channels: ["SMS", "email", "lead nurturing queue"],
    channelTags: ["sms", "email", "internal"],
    inputs: ["last interaction type", "stage and inactivity window", "prior objections", "preferred channel"],
    workflow: [
      "detect stall reason (timing, confusion, trust, budget, no-show)",
      "choose matching sequence branch",
      "send short personalized message",
      "wait for reply and reclassify intent",
      "escalate warm replies to concierge/owner"
    ],
    frameworkLabel: "Branches",
    frameworkItems: [
      "post-assessment-no-booking",
      "post-booking-no-show",
      "consult-done-no-purchase",
      "cart-or-offer-abandon",
      "refill-due"
    ],
    guardrails: [
      "do not over-message beyond cadence caps",
      "stop promotional messaging if compliance risk tag exists",
      "escalate negative sentiment or complaint language to human owner"
    ],
    sla: "Warm replies escalate same day",
    outputLabel: "Message Pattern",
    outputBody: `- personalized opener
- one clear next step
- low-friction CTA`
  },
  {
    id: "operations",
    index: "06",
    name: "Mayan Operations Agent",
    mission:
      "Prevent fulfillment and coordination breakdowns by monitoring inventory, pricing, payment, and delivery exceptions.",
    channels: ["operations queue", "order system", "fulfillment events"],
    channelTags: ["internal", "email"],
    inputs: ["order and payment events", "inventory levels", "price tables and update feeds", "shipping and tracking updates"],
    workflow: [
      "validate order data completeness",
      "check stock and fulfillment readiness",
      "detect payment or delivery exceptions",
      "trigger customer-safe communication",
      "assign internal tasks and due times"
    ],
    frameworkLabel: "Exception Types",
    frameworkItems: ["stockout-risk", "payment-failed", "address-missing", "carrier-delay", "refund-request"],
    guardrails: [
      "no silent failures",
      "every exception must produce an owner + deadline",
      "customer communications must preserve trust and clarity"
    ],
    sla: "Payment 2h · Shipping 6h · Refund same day",
    outputLabel: "SLA Rules",
    outputBody: `- payment issues: first response within 2h
- shipping delays: proactive notification within 6h
- refund/dispute: owner assignment same day`
  },
  {
    id: "team_mentor",
    index: "07",
    name: "Mayan Team Mentor Agent",
    mission:
      "Improve team quality, consistency, and confidence through daily AI-assisted coaching on live conversations and outcomes.",
    channels: ["QA review", "coaching notes", "manager review"],
    channelTags: ["internal"],
    inputs: ["sampled support/sales conversations", "booking and close outcomes", "compliance and tone checks", "SOP and product updates"],
    workflow: [
      "sample daily interactions from each queue",
      "score clarity, empathy, conversion intent, and compliance",
      "generate short coaching notes",
      "assign one improvement action per team member",
      "track weekly uplift metrics"
    ],
    frameworkLabel: "Daily Scorecard",
    frameworkItems: [
      "response clarity (1-5)",
      "empathy and tone (1-5)",
      "next-step specificity (1-5)",
      "compliance safety (pass/fail)"
    ],
    guardrails: [
      "coach behavior, not personality",
      "use examples from real conversations",
      "flag repeated risks early for manager review"
    ],
    sla: "One improvement action per person/day",
    outputLabel: "Coaching Workflow",
    outputBody: `1. sample daily interactions from each queue
2. score clarity, empathy, conversion intent, and compliance
3. generate short coaching notes
4. assign one improvement action per team member
5. track weekly uplift metrics`
  }
];

const FILTERS = [
  { id: "all", label: "All Channels" },
  { id: "chat", label: "Chat" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "voice", label: "Voice" },
  { id: "social", label: "Social" },
  { id: "internal", label: "Internal" }
];

const state = {
  activeFilter: "all"
};

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderList(items, ordered = false) {
  const tag = ordered ? "ol" : "ul";
  const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag}>${listItems}</${tag}>`;
}

function renderFramework(agent) {
  if (agent.frameworkItems.length > 0) {
    return renderList(agent.frameworkItems);
  }
  return `<p>${escapeHtml("Use output view to inspect this template.")}</p>`;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  return response.json();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntilDone(jobId) {
  for (let i = 0; i < 120; i += 1) {
    const status = await getJson(`${API_BASE}/status/${encodeURIComponent(jobId)}`);

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Agent run failed");
    }

    await wait(1200);
  }

  throw new Error("Timed out waiting for agent run");
}

function formatReportText(agent, payload) {
  const lines = [];
  lines.push(`${agent.name} · Live Run Report`);
  lines.push("");

  if (payload?.report) {
    const report = payload.report;
    lines.push(`Title: ${report.title || "n/a"}`);
    lines.push(`Subtitle: ${report.subtitle || "n/a"}`);
    lines.push("");
    lines.push(`Summary: ${report.summary || "n/a"}`);
    lines.push("");

    lines.push("Key Points:");
    (report.bullets || []).forEach((item) => lines.push(`- ${item}`));
    lines.push("");

    lines.push("KPIs:");
    (report.kpis || []).forEach((kpi) => lines.push(`- ${kpi.key}: ${kpi.value}`));
    lines.push("");
  }

  lines.push("Runtime:");
  lines.push(`- Provider: ${payload?.provider || "n/a"}`);
  lines.push(`- Model: ${payload?.model || "n/a"}`);
  lines.push(`- Request ID: ${payload?.requestId || "n/a"}`);
  lines.push(`- Job ID: ${payload?.jobId || "n/a"}`);
  lines.push("");

  if (payload?.integrations) {
    lines.push("Integrations:");
    const { ghlWebhook, ghlDirect, retell } = payload.integrations;
    if (ghlWebhook) {
      lines.push(`- GHL Webhook: ${ghlWebhook.status}${ghlWebhook.reason ? ` (${ghlWebhook.reason})` : ""}`);
    }
    if (ghlDirect) {
      lines.push(`- GHL Direct API: ${ghlDirect.status}${ghlDirect.reason ? ` (${ghlDirect.reason})` : ""}`);
    }
    if (retell) {
      lines.push(`- Retell: ${retell.status}${retell.mode ? ` (${retell.mode})` : ""}${retell.reason ? ` (${retell.reason})` : ""}`);
      if (retell.callId) {
        lines.push(`- Retell Call ID: ${retell.callId}`);
      }
    }
  }

  return lines.join("\n");
}

async function runAgent(agentId, button) {
  const agent = AGENTS.find((item) => item.id === agentId);
  if (!agent) {
    showToast(`Unknown agent: ${agentId}`);
    return;
  }

  const priorLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Running...";

  try {
    const run = await postJson(`${API_BASE}/run`, {
      agentId,
      brand: BRAND_PROFILE,
      context: `Manual dashboard run for ${agent.name}`
    });

    let report;
    if (run.status === "completed" && run.report) {
      report = run;
    } else {
      await pollUntilDone(run.jobId);
      report = await getJson(`${API_BASE}/report/${encodeURIComponent(run.jobId)}`);
    }

    openModal(`${agent.name} · Run Report`, formatReportText(agent, report));
    showToast(`${agent.name} completed`);
  } catch (error) {
    showToast(`Run failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = priorLabel;
  }
}

function renderCards() {
  const grid = byId("agentGrid");
  const filtered =
    state.activeFilter === "all"
      ? AGENTS
      : AGENTS.filter((agent) => agent.channelTags.includes(state.activeFilter));

  grid.innerHTML = filtered
    .map(
      (agent) => `
        <article class="agent-card">
          <div class="head">
            <div>
              <span class="idx">${escapeHtml(agent.index)}</span>
              <h3>${escapeHtml(agent.name)}</h3>
            </div>
          </div>
          <p class="mission">${escapeHtml(agent.mission)}</p>
          <div class="pills">
            ${agent.channels
              .map((channel) => `<span class="pill">${escapeHtml(channel)}</span>`)
              .join("")}
          </div>
          <div class="cols">
            <section class="block">
              <h4>Inputs</h4>
              ${renderList(agent.inputs)}
            </section>
            <section class="block">
              <h4>Workflow</h4>
              ${renderList(agent.workflow, true)}
            </section>
          </div>
          <div class="cols">
            <section class="block">
              <h4>${escapeHtml(agent.frameworkLabel)}</h4>
              ${renderFramework(agent)}
            </section>
            <section class="block">
              <h4>Guardrails</h4>
              ${renderList(agent.guardrails)}
            </section>
          </div>
          <div class="agent-actions">
            <span class="sla">${escapeHtml(agent.sla)}</span>
            <div class="action-row">
              <button class="run-btn" data-agent-id="${escapeHtml(agent.id)}">Run Agent</button>
              <button data-schema-id="${escapeHtml(agent.id)}">View Output</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  wireCardActions();
}

function renderFilters() {
  const filtersEl = byId("channelFilters");
  filtersEl.innerHTML = FILTERS.map(
    (filter) => `
      <button class="chip ${state.activeFilter === filter.id ? "active" : ""}" data-filter-id="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>
    `
  ).join("");

  filtersEl.querySelectorAll("[data-filter-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.getAttribute("data-filter-id");
      renderFilters();
      renderCards();
    });
  });
}

function wireCardActions() {
  document.querySelectorAll("[data-schema-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-schema-id");
      openOutputModal(id);
    });
  });

  document.querySelectorAll(".run-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-agent-id");
      runAgent(id, button);
    });
  });
}

function openModal(titleText, bodyText) {
  const modal = byId("schemaModal");
  const title = byId("schemaTitle");
  const code = byId("schemaCode");

  title.textContent = titleText;
  code.textContent = bodyText;
  if (typeof modal.showModal === "function") {
    modal.showModal();
  }
}

function openOutputModal(agentId) {
  const target = AGENTS.find((agent) => agent.id === agentId);
  if (!target) {
    return;
  }
  openModal(`${target.name} · ${target.outputLabel}`, target.outputBody);
}

function showToast(message) {
  let toast = byId("mbToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mbToast";
    toast.className = "mb-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.hideTimer);
  showToast.hideTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function wireModal() {
  const modal = byId("schemaModal");
  const closeButton = byId("closeModal");
  closeButton.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.close();
    }
  });
}

async function checkRuntimeHealth() {
  try {
    const health = await getJson(`${API_BASE}/health`);
    const topbar = document.querySelector(".mb-topbar");
    if (topbar) {
      topbar.textContent = `${topbar.textContent} · RUNTIME: ${String(health.mode || "mock").toUpperCase()}`;
    }
  } catch {
    showToast("API runtime not reachable. Start server.mjs to enable live runs.");
  }
}

function init() {
  renderFilters();
  renderCards();
  wireModal();
  void checkRuntimeHealth();
}

init();