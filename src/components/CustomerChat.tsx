import { Send, Sparkles } from "lucide-react";
import type { ChatMessage, DemoCase } from "../types";

interface CustomerChatProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  demoCases: DemoCase[];
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onRunDemo: (demoCase: DemoCase) => void;
}

export function CustomerChat({
  messages,
  input,
  loading,
  demoCases,
  onInputChange,
  onSubmit,
  onRunDemo
}: CustomerChatProps) {
  return (
    <section className="panel chat-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Customer Chat</p>
          <h2>Hội thoại khiếu nại</h2>
        </div>
      </div>

      <div className="demo-actions">
        {demoCases.map((demoCase) => (
          <button key={demoCase.id} className="secondary-button" onClick={() => onRunDemo(demoCase)} type="button">
            <Sparkles size={16} />
            {demoCase.label}
          </button>
        ))}
      </div>

      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <span>{message.text}</span>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <span>Đang triage khiếu nại và tạo ticket...</span>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Nhập khiếu nại của khách..."
          rows={3}
        />
        <button className="primary-icon-button" onClick={onSubmit} disabled={!input.trim() || loading} type="button">
          <Send size={20} />
          <span>Gửi</span>
        </button>
      </div>
    </section>
  );
}
