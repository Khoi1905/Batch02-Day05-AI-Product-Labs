import { CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import type { TriageApiResponse } from "../types";

export type PipelineStepId = "intake" | "prompt" | "model" | "guardrail" | "ticket" | "ask_customer" | "hitl";

interface PipelineStep {
  id: PipelineStepId;
  label: string;
  description: string;
}

const pipelineSteps: PipelineStep[] = [
  {
    id: "intake",
    label: "Nhận complaint",
    description: "Chuẩn hóa text và chọn mock order."
  },
  {
    id: "prompt",
    label: "Dựng prompt",
    description: "Gắn system prompt version và order evidence."
  },
  {
    id: "model",
    label: "Gọi model",
    description: "Chọn model miễn phí, xoay vòng nếu lỗi."
  },
  {
    id: "guardrail",
    label: "Policy check",
    description: "Kiểm route, confidence, HITL và ngôn ngữ an toàn."
  },
  {
    id: "ticket",
    label: "Tạo ticket",
    description: "Sinh structured JSON và customer message."
  },
  {
    id: "ask_customer",
    label: "Hỏi thêm khách",
    description: "Dừng route cứng khi input chưa đủ rõ."
  },
  {
    id: "hitl",
    label: "Chờ HITL",
    description: "Store/driver/CSKH xác nhận trước phản hồi cuối."
  }
];

interface AiPipelineProps {
  activeStep: PipelineStepId;
  loading: boolean;
  result?: TriageApiResponse;
  statusText?: string;
}

function stepStatus(stepId: PipelineStepId, activeStep: PipelineStepId, loading: boolean, result?: TriageApiResponse) {
  const activeIndex = pipelineSteps.findIndex((step) => step.id === activeStep);
  const stepIndex = pipelineSteps.findIndex((step) => step.id === stepId);
  const ticketIndex = pipelineSteps.findIndex((step) => step.id === "ticket");

  if (loading && stepIndex === activeIndex) return "active";
  if (loading && stepIndex < activeIndex) return "done";
  if (loading) return "pending";

  if (result && result.ticket.route_to === "ask_customer") {
    if (stepId === "ask_customer") return "waiting";
    if (stepIndex <= ticketIndex) return "done";
    return "pending";
  }

  if (result && result.ticket.handoff_required) {
    if (stepId === "hitl") return "waiting";
    if (stepId === "ask_customer") return "skipped";
    if (stepIndex <= ticketIndex) return "done";
    return "pending";
  }

  if (result && stepIndex <= ticketIndex) return "done";
  return "pending";
}

export function AiPipeline({ activeStep, loading, result, statusText }: AiPipelineProps) {
  return (
    <section className="panel pipeline-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">AI Runtime</p>
          <h2>Pipeline đang chạy</h2>
        </div>
        {result?.telemetry.fallback_used && (
          <span className="badge confidence-medium">
            <ShieldCheck size={14} />
            fallback guarded
          </span>
        )}
      </div>

      <div className="pipeline-list">
        {pipelineSteps.map((step) => {
          const status = stepStatus(step.id, activeStep, loading, result);
          return (
            <div key={step.id} className={`pipeline-step ${status}`}>
              <div className="pipeline-icon">
                {status === "active" && <Loader2 size={17} />}
                {(status === "done" || status === "waiting") && <CheckCircle2 size={17} />}
                {status === "pending" && <Circle size={17} />}
              </div>
              <div>
                <strong>{step.label}</strong>
                <span>
                  {status === "waiting"
                    ? step.id === "ask_customer"
                      ? "Đang chờ khách bổ sung thông tin."
                      : "Đang chờ người xác nhận."
                    : status === "skipped"
                      ? "Không cần bước này cho route hiện tại."
                      : step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {statusText && <p className="pipeline-status-text">{statusText}</p>}
    </section>
  );
}
