import { CheckCircle2, FileImage, ReceiptText } from "lucide-react";
import type { OrderData } from "../types";

interface OrderPanelProps {
  order: OrderData;
}

export function OrderPanel({ order }: OrderPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Evidence / Order</p>
          <h2>{order.order_id}</h2>
        </div>
        <span className="badge neutral">{order.order_status}</span>
      </div>

      <div className="order-meta">
        <div>
          <span className="field-label">Merchant</span>
          <strong>{order.merchant_name}</strong>
        </div>
        <div>
          <span className="field-label">Customer</span>
          <strong>{order.customer_name}</strong>
        </div>
        <div>
          <span className="field-label">Payment</span>
          <strong>{order.payment_status}</strong>
        </div>
        <div>
          <span className="field-label">Driver</span>
          <strong>{order.driver_status}</strong>
        </div>
      </div>

      <div className="item-list">
        {order.items.map((item) => (
          <div key={item.name} className="item-row">
            <span>{item.name}</span>
            <strong>x{item.quantity}</strong>
          </div>
        ))}
      </div>

      <div className="evidence-list">
        <div className={order.evidence.customer_photo ? "evidence available" : "evidence missing"}>
          <FileImage size={18} />
          Customer photo: {order.evidence.customer_photo ? "có" : "thiếu"}
        </div>
        <div className={order.evidence.receipt_photo ? "evidence available" : "evidence missing"}>
          <ReceiptText size={18} />
          Receipt photo: {order.evidence.receipt_photo ? "có" : "thiếu"}
        </div>
        <div className={order.evidence.driver_dropoff_photo ? "evidence available" : "evidence missing"}>
          <CheckCircle2 size={18} />
          Dropoff proof: {order.evidence.driver_dropoff_photo ? "có" : "thiếu"}
        </div>
      </div>
    </section>
  );
}
