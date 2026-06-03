import { Activity, Braces, Clock, Cpu, FileInput, GitBranch, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { TriageApiResponse } from "../types";

interface MonitoringPanelProps {
  result?: TriageApiResponse;
}

function MetricCard({
  icon,
  label,
  value,
  helper
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span className="field-label">{label}</span>
        <strong>{value}</strong>
        {helper && <p>{helper}</p>}
      </div>
    </div>
  );
}

export function MonitoringPanel({ result }: MonitoringPanelProps) {
  if (!result) {
    return (
      <section className="panel monitoring-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Monitoring</p>
            <h2>Runtime telemetry</h2>
          </div>
        </div>
        <div className="empty-state">Telemetry sẽ xuất hiện sau lần triage đầu tiên.</div>
      </section>
    );
  }

  const { ticket, telemetry } = result;

  return (
    <section className="panel monitoring-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Monitoring</p>
          <h2>Theo dõi từng phần</h2>
        </div>
        <span className={`badge ${telemetry.status === "success" ? "confidence-high" : "confidence-medium"}`}>
          {telemetry.status}
        </span>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">
          <FileInput size={16} />
          <strong>Input intake</strong>
        </div>
        <div className="metric-grid">
          <MetricCard icon={<Braces size={18} />} label="Ticket type" value={ticket.issue_type} helper={ticket.summary} />
          <MetricCard icon={<GitBranch size={18} />} label="Route" value={ticket.route_to} helper={`Confidence: ${ticket.confidence}`} />
        </div>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">
          <Cpu size={16} />
          <strong>Model routing</strong>
        </div>
        <div className="metric-grid">
          <MetricCard icon={<Cpu size={18} />} label="Provider" value={telemetry.provider} helper={telemetry.model} />
          <MetricCard icon={<GitBranch size={18} />} label="Candidates" value={telemetry.model_candidates.length} helper={telemetry.model_candidates.join(" -> ")} />
        </div>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">
          <Activity size={16} />
          <strong>Latency & tokens</strong>
        </div>
        <div className="metric-grid three">
          <MetricCard icon={<Clock size={18} />} label="Latency" value={`${telemetry.latency_ms} ms`} />
          <MetricCard icon={<Braces size={18} />} label="Input tokens" value={telemetry.input_tokens_estimated} />
          <MetricCard icon={<Braces size={18} />} label="Output tokens" value={telemetry.output_tokens_estimated} />
        </div>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">
          <ShieldCheck size={16} />
          <strong>Prompt & guardrail</strong>
        </div>
        <div className="metric-grid">
          <MetricCard
            icon={<ShieldCheck size={18} />}
            label="Prompt version"
            value={telemetry.prompt.system_prompt_version}
            helper={`${telemetry.prompt.prompt_variant} · ${telemetry.prompt.prompt_hash}`}
          />
          <MetricCard
            icon={<ShieldCheck size={18} />}
            label="Fallback"
            value={telemetry.fallback_used ? "Có" : "Không"}
            helper={telemetry.fallback_reason ?? "Model output đạt policy alignment."}
          />
        </div>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">
          <Braces size={16} />
          <strong>Output JSON</strong>
        </div>
        <pre className="json-box small">{JSON.stringify(ticket, null, 2)}</pre>
      </div>
    </section>
  );
}
