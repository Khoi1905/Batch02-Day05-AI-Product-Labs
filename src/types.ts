export type IssueType =
  | "missing_item"
  | "wrong_item"
  | "damaged_or_spilled_item"
  | "not_received"
  | "refund_status"
  | "unclear";

export type RouteTo = "store" | "driver" | "customer_support" | "ask_customer";

export type Confidence = "high" | "medium" | "low";

export interface OrderItem {
  name: string;
  quantity: number;
}

export interface OrderEvidence {
  customer_photo: boolean;
  receipt_photo: boolean;
  driver_dropoff_photo?: boolean;
  merchant_receipt_match?: boolean;
}

export interface OrderData {
  order_id: string;
  order_status: "delivered" | "cancelled" | "in_progress";
  payment_status: "paid" | "refunded" | "pending";
  driver_status: "delivered" | "picked_up" | "not_assigned";
  delivery_status: "delivered" | "not_received_claim" | "unknown";
  merchant_name: string;
  customer_name: string;
  items: OrderItem[];
  evidence: OrderEvidence;
}

export interface TriageResult {
  issue_type: IssueType;
  summary: string;
  reported_items: string[];
  route_to: RouteTo;
  confidence: Confidence;
  missing_info: string[];
  questions_to_customer: string[];
  questions_to_store: string[];
  questions_to_driver: string[];
  handoff_required: boolean;
  handoff_reason: string;
  next_action: string;
  customer_message: string;
}

export interface PromptMetadata {
  system_prompt_version: string;
  prompt_variant: string;
  prompt_hash: string;
}

export interface TriageTelemetry {
  request_id: string;
  provider: "openrouter" | "rule_based";
  model: string;
  model_candidates: string[];
  fallback_used: boolean;
  fallback_reason?: string;
  latency_ms: number;
  input_tokens_estimated: number;
  output_tokens_estimated: number;
  prompt_tokens_estimated: number;
  status: "success" | "fallback" | "error";
  prompt: PromptMetadata;
  created_at: string;
}

export interface TriageApiResponse {
  ticket: TriageResult;
  telemetry: TriageTelemetry;
  raw_model_output?: string;
}

export interface ChatMessage {
  id: string;
  role: "customer" | "bot" | "system";
  text: string;
}

export interface DemoCase {
  id: string;
  label: string;
  orderId: string;
  complaint: string;
}

export interface EvalCase {
  id: string;
  name: string;
  orderId: string;
  complaint: string;
  expected: Pick<TriageResult, "issue_type" | "route_to" | "confidence">;
}

export interface EvalResult {
  id: string;
  name: string;
  passed: boolean;
  expected: EvalCase["expected"];
  actual: EvalCase["expected"];
  notes: string[];
}
