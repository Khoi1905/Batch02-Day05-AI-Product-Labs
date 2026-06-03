import { SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION, PROMPT_VARIANT, buildUserPrompt, promptHash } from "./prompt";
import { triageComplaint } from "../src/logic/triage";
import type { OrderData, TriageApiResponse, TriageResult, TriageTelemetry } from "../src/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function parseModelList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const models = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return models.length > 0 ? models : fallback;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function chooseModelCandidates(complaintText: string, orderData: OrderData): string[] {
  const simpleFallback = ["openrouter/auto"];
  const complexFallback = ["openrouter/auto"];
  const simpleModels = parseModelList(process.env.OPENROUTER_MODELS_SIMPLE, simpleFallback);
  const complexModels = parseModelList(process.env.OPENROUTER_MODELS_COMPLEX, complexFallback);
  const complexSignals = complaintText.length > 280 || orderData.delivery_status === "not_received_claim";
  return dedupe(complexSignals ? [...complexModels, ...simpleModels] : [...simpleModels, ...complexModels]);
}

function validateTicket(value: unknown): TriageResult {
  if (!value || typeof value !== "object") {
    throw new Error("Model output is not an object");
  }

  const ticket = value as TriageResult;
  const requiredStringFields: Array<keyof TriageResult> = [
    "issue_type",
    "summary",
    "route_to",
    "confidence",
    "handoff_reason",
    "next_action",
    "customer_message"
  ];

  for (const field of requiredStringFields) {
    if (typeof ticket[field] !== "string") {
      throw new Error(`Model output missing string field: ${field}`);
    }
  }

  const requiredArrayFields: Array<keyof TriageResult> = [
    "reported_items",
    "missing_info",
    "questions_to_customer",
    "questions_to_store",
    "questions_to_driver"
  ];

  for (const field of requiredArrayFields) {
    if (!Array.isArray(ticket[field])) {
      throw new Error(`Model output missing array field: ${field}`);
    }
  }

  if (typeof ticket.handoff_required !== "boolean") {
    throw new Error("Model output missing boolean field: handoff_required");
  }

  return ticket;
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace < 0) {
      throw new Error("No JSON object found in model output");
    }
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  }
}

function extractOpenRouterContent(payload: unknown): string {
  const response = payload as {
    error?: { message?: string; metadata?: { raw?: string; provider_name?: string } };
    choices?: Array<{
      text?: string;
      message?: { content?: string | Array<{ type?: string; text?: string }> };
    }>;
  };

  if (response.error?.message) {
    const provider = response.error.metadata?.provider_name;
    const raw = response.error.metadata?.raw;
    const detail = raw ? ` (${raw.slice(0, 160)})` : "";
    throw new Error(`OpenRouter provider error${provider ? ` from ${provider}` : ""}: ${response.error.message}${detail}`);
  }

  const choice = response.choices?.[0];
  if (typeof choice?.message?.content === "string" && choice.message.content.trim()) {
    return choice.message.content;
  }

  if (Array.isArray(choice?.message?.content)) {
    const content = choice.message.content
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    if (content) return content;
  }

  if (typeof choice?.text === "string" && choice.text.trim()) {
    return choice.text;
  }

  throw new Error("OpenRouter returned no message content");
}

function policyAlignmentErrors(modelTicket: TriageResult, ruleTicket: TriageResult): string[] {
  const errors: string[] = [];
  const forbiddenPatterns = ["chắc chắn được hoàn tiền", "chac chan duoc hoan tien", "lỗi do cửa hàng", "loi do cua hang", "lỗi do tài xế", "loi do tai xe"];
  const normalizedMessage = modelTicket.customer_message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (modelTicket.issue_type !== ruleTicket.issue_type) {
    errors.push(`issue_type mismatch: model=${modelTicket.issue_type}, policy=${ruleTicket.issue_type}`);
  }
  if (modelTicket.route_to !== ruleTicket.route_to) {
    errors.push(`route_to mismatch: model=${modelTicket.route_to}, policy=${ruleTicket.route_to}`);
  }
  if (ruleTicket.handoff_required && !modelTicket.handoff_required) {
    errors.push("handoff_required must stay true for this policy path");
  }
  if (!ruleTicket.handoff_required && modelTicket.handoff_required) {
    errors.push("handoff_required must stay false for this policy path");
  }
  if (ruleTicket.confidence === "high" && modelTicket.confidence !== "high") {
    errors.push(`confidence mismatch: model=${modelTicket.confidence}, policy=high`);
  }
  if (forbiddenPatterns.some((pattern) => normalizedMessage.includes(pattern))) {
    errors.push("customer_message contains forbidden commitment or blame language");
  }

  return errors;
}

function buildTelemetry(params: {
  requestId: string;
  provider: "openrouter" | "rule_based";
  model: string;
  modelCandidates: string[];
  fallbackUsed: boolean;
  fallbackReason?: string;
  latencyMs: number;
  inputText: string;
  outputText: string;
  status: "success" | "fallback" | "error";
}): TriageTelemetry {
  const promptText = `${SYSTEM_PROMPT}\n${params.inputText}`;
  return {
    request_id: params.requestId,
    provider: params.provider,
    model: params.model,
    model_candidates: params.modelCandidates,
    fallback_used: params.fallbackUsed,
    fallback_reason: params.fallbackReason,
    latency_ms: params.latencyMs,
    input_tokens_estimated: estimateTokens(params.inputText),
    output_tokens_estimated: estimateTokens(params.outputText),
    prompt_tokens_estimated: estimateTokens(promptText),
    status: params.status,
    prompt: {
      system_prompt_version: SYSTEM_PROMPT_VERSION,
      prompt_variant: PROMPT_VARIANT,
      prompt_hash: promptHash(SYSTEM_PROMPT)
    },
    created_at: new Date().toISOString()
  };
}

function summarizeModelError(model: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (error instanceof Error && error.name === "AbortError") {
    return `${model}: timeout`;
  }
  if (lower.includes("429") || lower.includes("rate-limited") || lower.includes("rate limit")) {
    return `${model}: rate-limited`;
  }
  if (lower.includes("no message content") || lower.includes("missing choices")) {
    return `${model}: no content returned`;
  }
  if (lower.includes("policy alignment")) {
    return `${model}: output failed policy/safety alignment`;
  }
  if (lower.includes("openrouter provider error")) {
    return `${model}: provider error`;
  }

  return `${model}: ${message.slice(0, 120)}`;
}

async function callOpenRouter(model: string, inputPrompt: string, requestId: string): Promise<{ text: string; latencyMs: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.OPENROUTER_TIMEOUT_MS ?? 12000)
  );
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "GrabFood Complaint Router"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: inputPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      metadata: {
        request_id: requestId,
        system_prompt_version: SYSTEM_PROMPT_VERSION,
        prompt_variant: PROMPT_VARIANT
      }
    })
  }).finally(() => clearTimeout(timeout));

  const latencyMs = Date.now() - startedAt;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = (payload as { error?: { message?: string } })?.error?.message;
    throw new Error(`OpenRouter ${response.status}${providerMessage ? `: ${providerMessage}` : ""}`);
  }

  return { text: extractOpenRouterContent(payload), latencyMs };
}

export async function triageWithOpenRouter(complaintText: string, orderData: OrderData): Promise<TriageApiResponse> {
  const requestId = crypto.randomUUID();
  const inputPrompt = buildUserPrompt(complaintText, orderData);
  const modelCandidates = chooseModelCandidates(complaintText, orderData);
  const policyTicket = triageComplaint(complaintText, orderData);
  const errors: string[] = [];

  for (const model of modelCandidates) {
    try {
      const { text, latencyMs } = await callOpenRouter(model, inputPrompt, requestId);
      const ticket = validateTicket(extractJson(text));
      const alignmentErrors = policyAlignmentErrors(ticket, policyTicket);
      if (alignmentErrors.length > 0) {
        throw new Error(`Model output failed policy alignment: ${alignmentErrors.join("; ")}`);
      }
      const telemetry = buildTelemetry({
        requestId,
        provider: "openrouter",
        model,
        modelCandidates,
        fallbackUsed: errors.length > 0,
        fallbackReason: errors.length > 0 ? errors.join(" | ") : undefined,
        latencyMs,
        inputText: inputPrompt,
        outputText: text,
        status: "success"
      });
      return { ticket, telemetry, raw_model_output: text };
    } catch (error) {
      errors.push(summarizeModelError(model, error));
    }
  }

  const startedAt = Date.now();
  const ticket = policyTicket;
  const outputText = JSON.stringify(ticket);
  return {
    ticket,
    telemetry: buildTelemetry({
      requestId,
      provider: "rule_based",
      model: "rule_based_fallback",
      modelCandidates,
      fallbackUsed: true,
      fallbackReason: errors.join(" | ") || "All OpenRouter models unavailable",
      latencyMs: Date.now() - startedAt,
      inputText: inputPrompt,
      outputText,
      status: "fallback"
    }),
    raw_model_output: outputText
  };
}
