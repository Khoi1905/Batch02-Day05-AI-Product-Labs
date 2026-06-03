import { useMemo, useRef, useState } from "react";
import { CustomerChat } from "./components/CustomerChat";
import { HITLPanel } from "./components/HITLPanel";
import { AiPipeline, type PipelineStepId } from "./components/AiPipeline";
import { MonitoringPanel } from "./components/MonitoringPanel";
import { OrderPanel } from "./components/OrderPanel";
import { TriagePanel } from "./components/TriagePanel";
import { demoCases, getOrderById, mockOrders } from "./data/mockOrders";
import { triageComplaint } from "./logic/triage";
import type { ChatMessage, DemoCase, EvalResult, OrderData, TriageApiResponse } from "./types";

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function buildFrontendFallback(complaintText: string, order: OrderData, reason: string): TriageApiResponse {
  const startedAt = Date.now();
  const ticket = triageComplaint(complaintText, order);
  return {
    ticket,
    telemetry: {
      request_id: makeId("frontend_fallback"),
      provider: "rule_based",
      model: "frontend_rule_based_fallback",
      model_candidates: [],
      fallback_used: true,
      fallback_reason: reason,
      latency_ms: Date.now() - startedAt,
      input_tokens_estimated: Math.ceil(complaintText.length / 4),
      output_tokens_estimated: Math.ceil(JSON.stringify(ticket).length / 4),
      prompt_tokens_estimated: Math.ceil((complaintText.length + JSON.stringify(order).length) / 4),
      status: "fallback",
      prompt: {
        system_prompt_version: "grabfood-complaint-router-v1.0.0",
        prompt_variant: "frontend-rule-based",
        prompt_hash: "local"
      },
      created_at: new Date().toISOString()
    },
    raw_model_output: JSON.stringify(ticket)
  };
}

function buildRouteStatusMessage(payload: TriageApiResponse): string {
  const { ticket, telemetry } = payload;
  const runtime = telemetry.fallback_used
    ? `Runtime: dùng fallback (${telemetry.provider}) sau khi model/policy chưa đạt.`
    : `Runtime: dùng ${telemetry.provider} model ${telemetry.model}.`;

  if (ticket.route_to === "ask_customer") {
    return `${runtime} Pipeline dừng ở bước hỏi thêm khách vì confidence thấp hoặc thiếu thông tin.`;
  }

  if (ticket.route_to === "store") {
    return `${runtime} Ticket đang chờ cửa hàng xác nhận trước khi CSKH review.`;
  }

  if (ticket.route_to === "driver") {
    return `${runtime} Ticket đang chờ tài xế xác nhận thông tin giao hàng.`;
  }

  return `${runtime} Ticket đang chờ CSKH review vì cần kiểm tra thêm hoặc có rủi ro vận hành.`;
}

function finalPipelineStep(payload: TriageApiResponse): PipelineStepId {
  if (payload.ticket.route_to === "ask_customer") return "ask_customer";
  if (payload.ticket.handoff_required) return "hitl";
  return "ticket";
}

function finalPipelineStatusText(payload: TriageApiResponse): string {
  const { ticket } = payload;

  if (ticket.route_to === "ask_customer") {
    return "Đã dừng route cứng. Đang chờ khách bổ sung mô tả lỗi hoặc bằng chứng.";
  }

  if (ticket.route_to === "store") {
    return "Ticket đã route tới cửa hàng. Đang chờ cửa hàng xác nhận tình trạng đóng gói.";
  }

  if (ticket.route_to === "driver") {
    return "Ticket đã route tới tài xế. Đang chờ tài xế xác nhận thông tin giao hàng.";
  }

  return "Ticket đã chuyển CSKH review. Đang chờ người thật kiểm tra trước khi phản hồi cuối.";
}

export default function App() {
  const [currentOrder, setCurrentOrder] = useState<OrderData>(mockOrders[0]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Chào bạn, mình có thể hỗ trợ ghi nhận khiếu nại GrabFood và chuyển đúng bên xác nhận."
    }
  ]);
  const [result, setResult] = useState<TriageApiResponse | undefined>();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<PipelineStepId>("intake");
  const [pipelineStatusText, setPipelineStatusText] = useState("Chưa có complaint mới.");
  const [finalMessage, setFinalMessage] = useState<string | undefined>();
  const [evalResults, setEvalResults] = useState<EvalResult[] | undefined>();
  const [evalLoading, setEvalLoading] = useState(false);
  const runIdRef = useRef(0);

  const activeOrderIds = useMemo(() => mockOrders.map((order) => order.order_id), []);

  async function submitComplaint(complaintText = input, order = currentOrder) {
    const text = complaintText.trim();
    if (!text) return;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const scheduleForCurrentRun = (delayMs: number, action: () => void) => {
      window.setTimeout(() => {
        if (runIdRef.current === runId) {
          action();
        }
      }, delayMs);
    };

    setLoading(true);
    setActiveStep("intake");
    setPipelineStatusText("Đã nhận complaint, đang chuẩn bị dữ liệu order và evidence.");
    setResult(undefined);
    setFinalMessage(undefined);
    setInput("");
    setMessages((previous) => [...previous, { id: makeId("customer"), role: "customer", text }]);

    try {
      setActiveStep("prompt");
      setPipelineStatusText("Đang dựng prompt với system prompt version và mock order data.");
      scheduleForCurrentRun(250, () => setActiveStep("model"));
      scheduleForCurrentRun(250, () => setPipelineStatusText("Đang gọi OpenRouter model hoặc fallback theo model rotation."));
      scheduleForCurrentRun(900, () => setActiveStep("guardrail"));
      scheduleForCurrentRun(900, () => setPipelineStatusText("Đang kiểm guardrail: route, confidence, HITL và ngôn ngữ an toàn."));
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintText: text, orderData: order })
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const payload = (await response.json()) as TriageApiResponse;
      setActiveStep("ticket");
      setPipelineStatusText("Đã tạo structured ticket và customer message.");
      setResult(payload);
      const routeStatus = buildRouteStatusMessage(payload);
      setMessages((previous) => [
        ...previous,
        { id: makeId("bot"), role: "bot", text: payload.ticket.customer_message },
        { id: makeId("system"), role: "system", text: routeStatus }
      ]);
      scheduleForCurrentRun(250, () => {
        setActiveStep(finalPipelineStep(payload));
        setPipelineStatusText(finalPipelineStatusText(payload));
      });
    } catch (error) {
      const payload = buildFrontendFallback(text, order, error instanceof Error ? error.message : "API unavailable");
      setActiveStep("ticket");
      setPipelineStatusText("API không sẵn sàng, đã dùng rule-based fallback để tạo ticket.");
      setResult(payload);
      const routeStatus = buildRouteStatusMessage(payload);
      setMessages((previous) => [
        ...previous,
        { id: makeId("bot"), role: "bot", text: payload.ticket.customer_message },
        { id: makeId("system"), role: "system", text: routeStatus }
      ]);
      scheduleForCurrentRun(250, () => {
        setActiveStep(finalPipelineStep(payload));
        setPipelineStatusText(finalPipelineStatusText(payload));
      });
    } finally {
      setLoading(false);
    }
  }

  function runDemo(demoCase: DemoCase) {
    const order = getOrderById(demoCase.orderId);
    setCurrentOrder(order);
    void submitComplaint(demoCase.complaint, order);
  }

  function applyHitlAction(action: "store_confirm_missing" | "driver_confirm_delivered" | "cskh_needs_more_info" | "cskh_approve_review") {
    if (!result) return;

    const itemLabel = result.ticket.reported_items[0] ?? "món được phản ánh";
    const messagesByAction = {
      store_confirm_missing: `Mình đã ghi nhận khiếu nại thiếu ${itemLabel} trong đơn ${currentOrder.order_id}. Cửa hàng đã xác nhận cần CSKH kiểm tra tình trạng đóng gói. Yêu cầu này sẽ được CSKH xem xét trước khi có phương án hỗ trợ tiếp theo.`,
      driver_confirm_delivered: `Tài xế đã gửi xác nhận giao đơn ${currentOrder.order_id}. Vì thông tin của bạn và trạng thái hệ thống chưa khớp, CSKH sẽ tiếp tục kiểm tra trước khi phản hồi kết quả.`,
      cskh_needs_more_info: `Mình cần thêm thông tin để CSKH kiểm tra đúng vấn đề của đơn ${currentOrder.order_id}. Bạn vui lòng bổ sung ảnh món đã nhận, ảnh hóa đơn/tem đơn hoặc mô tả rõ lỗi gặp phải.`,
      cskh_approve_review: `CSKH đã tiếp nhận ticket của đơn ${currentOrder.order_id}. Yêu cầu sẽ được kiểm tra theo bằng chứng hiện có và phản hồi phương án hỗ trợ sau khi hoàn tất xác nhận.`
    };

    const message = messagesByAction[action];
    setFinalMessage(message);
    setMessages((previous) => [...previous, { id: makeId("hitl"), role: "bot", text: message }]);
  }

  async function runEval() {
    setEvalLoading(true);
    try {
      const response = await fetch("/api/evals/run", { method: "POST" });
      const payload = (await response.json()) as { results: EvalResult[] };
      setEvalResults(payload.results);
    } catch {
      setEvalResults([
        {
          id: "eval_api_unavailable",
          name: "Eval API unavailable",
          passed: false,
          expected: { issue_type: "unclear", route_to: "ask_customer", confidence: "low" },
          actual: { issue_type: "unclear", route_to: "ask_customer", confidence: "low" },
          notes: ["Không gọi được backend eval endpoint."]
        }
      ]);
    } finally {
      setEvalLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">TeamA02 · Track C - GrabFood</p>
          <h1>GrabFood 3-way Complaint Router</h1>
          <p>
            Prototype triage khiếu nại đơn hàng: AI phân loại, tạo ticket, route tới store/driver/CSKH và chờ HITL trước khi phản hồi cuối.
          </p>
        </div>
        <div className="order-switcher">
          {activeOrderIds.map((orderId) => (
            <button
              key={orderId}
              className={orderId === currentOrder.order_id ? "order-chip active" : "order-chip"}
              onClick={() => setCurrentOrder(getOrderById(orderId))}
              type="button"
            >
              {orderId}
            </button>
          ))}
        </div>
      </header>

      <div className="dashboard-grid">
        <CustomerChat
          messages={messages}
          input={input}
          loading={loading}
          demoCases={demoCases}
          onInputChange={setInput}
          onSubmit={() => void submitComplaint()}
          onRunDemo={runDemo}
        />
        <AiPipeline activeStep={activeStep} loading={loading} result={result} statusText={pipelineStatusText} />
        <TriagePanel result={result} evalResults={evalResults} evalLoading={evalLoading} onRunEval={() => void runEval()} />
        <OrderPanel order={currentOrder} />
        <HITLPanel ticket={result?.ticket} finalMessage={finalMessage} onAction={applyHitlAction} />
        <MonitoringPanel result={result} />
      </div>
    </main>
  );
}
