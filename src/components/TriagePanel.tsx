import { Clipboard, FlaskConical } from "lucide-react";
import type { EvalResult, TriageApiResponse, TriageResult } from "../types";

interface TriagePanelProps {
  result?: TriageApiResponse;
  evalResults?: EvalResult[];
  evalLoading: boolean;
  onRunEval: () => void;
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}

function compactTicket(ticket: TriageResult) {
  return {
    issue_type: ticket.issue_type,
    summary: ticket.summary,
    reported_items: ticket.reported_items,
    route_to: ticket.route_to,
    confidence: ticket.confidence,
    missing_info: ticket.missing_info,
    next_action: ticket.next_action,
    handoff_required: ticket.handoff_required,
    handoff_reason: ticket.handoff_reason
  };
}

export function TriagePanel({ result, evalResults, evalLoading, onRunEval }: TriagePanelProps) {
  const ticket = result?.ticket;
  const telemetry = result?.telemetry;
  const passCount = evalResults?.filter((item) => item.passed).length ?? 0;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI Triage</p>
          <h2>Structured ticket</h2>
        </div>
        {ticket && (
          <div className="badge-row">
            <Badge label={ticket.confidence} tone={`confidence-${ticket.confidence}`} />
            <Badge label={ticket.route_to} tone={`route-${ticket.route_to}`} />
          </div>
        )}
      </div>

      {ticket ? (
        <>
          <div className="triage-grid">
            <div>
              <span className="field-label">Issue type</span>
              <strong>{ticket.issue_type}</strong>
            </div>
            <div>
              <span className="field-label">Next action</span>
              <strong>{ticket.next_action}</strong>
            </div>
            <div>
              <span className="field-label">HITL</span>
              <strong>{ticket.handoff_required ? "Required" : "Not required"}</strong>
            </div>
            <div>
              <span className="field-label">Missing info</span>
              <strong>{ticket.missing_info.length ? ticket.missing_info.join(", ") : "Không thiếu"}</strong>
            </div>
          </div>

          <pre className="json-box">{JSON.stringify(compactTicket(ticket), null, 2)}</pre>
        </>
      ) : (
        <div className="empty-state">Chọn test case hoặc nhập khiếu nại để tạo ticket.</div>
      )}

      <div className="eval-box">
        <div className="telemetry-title">
          <FlaskConical size={16} />
          Eval set
        </div>
        <button className="secondary-button fit" onClick={onRunEval} disabled={evalLoading} type="button">
          <Clipboard size={16} />
          {evalLoading ? "Đang chạy eval" : "Chạy eval nhanh"}
        </button>
        {evalResults && (
          <div className="eval-summary">
            <strong>
              {passCount}/{evalResults.length} pass
            </strong>
            {evalResults.map((item) => (
              <div key={item.id} className={`eval-row ${item.passed ? "pass" : "fail"}`}>
                <span>{item.name}</span>
                <strong>{item.passed ? "PASS" : "FAIL"}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
