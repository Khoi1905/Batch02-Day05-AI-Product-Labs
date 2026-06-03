import { Headphones, Store, Truck } from "lucide-react";
import type { TriageResult } from "../types";

interface HITLPanelProps {
  ticket?: TriageResult;
  finalMessage?: string;
  onAction: (action: "store_confirm_missing" | "driver_confirm_delivered" | "cskh_needs_more_info" | "cskh_approve_review") => void;
}

export function HITLPanel({ ticket, finalMessage, onAction }: HITLPanelProps) {
  const route = ticket?.route_to;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">HITL Panel</p>
          <h2>Human confirmation</h2>
        </div>
      </div>

      {!ticket && <div className="empty-state">Ticket sẽ xuất hiện sau khi AI triage.</div>}

      {ticket && (
        <>
          <div className="hitl-route">
            {route === "store" && <Store size={22} />}
            {route === "driver" && <Truck size={22} />}
            {(route === "customer_support" || route === "ask_customer") && <Headphones size={22} />}
            <div>
              <span className="field-label">Route hiện tại</span>
              <strong>{route}</strong>
            </div>
          </div>

          <div className="question-block">
            {ticket.questions_to_store.length > 0 && (
              <>
                <span className="field-label">Câu hỏi cho cửa hàng</span>
                {ticket.questions_to_store.map((question) => (
                  <p key={question}>{question}</p>
                ))}
              </>
            )}
            {ticket.questions_to_driver.length > 0 && (
              <>
                <span className="field-label">Câu hỏi cho tài xế</span>
                {ticket.questions_to_driver.map((question) => (
                  <p key={question}>{question}</p>
                ))}
              </>
            )}
            {ticket.questions_to_customer.length > 0 && (
              <>
                <span className="field-label">Câu hỏi cho khách</span>
                {ticket.questions_to_customer.map((question) => (
                  <p key={question}>{question}</p>
                ))}
              </>
            )}
          </div>

          <div className="hitl-actions">
            <button className="secondary-button" onClick={() => onAction("store_confirm_missing")} disabled={route !== "store"} type="button">
              <Store size={16} />
              Store confirms missing item
            </button>
            <button className="secondary-button" onClick={() => onAction("driver_confirm_delivered")} disabled={route !== "driver" && route !== "customer_support"} type="button">
              <Truck size={16} />
              Driver confirms delivered
            </button>
            <button className="secondary-button" onClick={() => onAction("cskh_needs_more_info")} disabled={route === "store" && ticket.confidence === "high"} type="button">
              <Headphones size={16} />
              CSKH needs more info
            </button>
            <button className="secondary-button" onClick={() => onAction("cskh_approve_review")} disabled={!ticket.handoff_required} type="button">
              <Headphones size={16} />
              CSKH approves review
            </button>
          </div>

          {finalMessage && (
            <div className="final-message">
              <span className="field-label">Final customer message</span>
              <p>{finalMessage}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
