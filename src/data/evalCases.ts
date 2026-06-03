import type { EvalCase } from "../types";

export const evalCases: EvalCase[] = [
  {
    id: "eval_missing_item_high",
    name: "Thiếu món rõ ràng, có bằng chứng",
    orderId: "GF12345",
    complaint:
      "Đơn thiếu trà sữa trân châu. Tôi có ảnh món đã nhận và hóa đơn, chỉ có cơm gà với khoai tây chiên.",
    expected: {
      issue_type: "missing_item",
      route_to: "store",
      confidence: "high"
    }
  },
  {
    id: "eval_unclear_low",
    name: "Khiếu nại mơ hồ, thiếu bằng chứng",
    orderId: "GF67890",
    complaint: "Đơn này có vấn đề, tôi muốn hoàn tiền.",
    expected: {
      issue_type: "unclear",
      route_to: "ask_customer",
      confidence: "low"
    }
  },
  {
    id: "eval_not_received_failure",
    name: "Chưa nhận nhưng hệ thống báo delivered",
    orderId: "GF24680",
    complaint: "App báo đã giao nhưng tôi chưa nhận được đơn, cũng không thấy ảnh giao hàng.",
    expected: {
      issue_type: "not_received",
      route_to: "customer_support",
      confidence: "medium"
    }
  },
  {
    id: "eval_wrong_item_medium",
    name: "Nhận sai món, cần cửa hàng xác nhận",
    orderId: "GF12345",
    complaint: "Tôi đặt cơm gà nhưng nhận thành bún bò, có ảnh món đã nhận.",
    expected: {
      issue_type: "wrong_item",
      route_to: "store",
      confidence: "medium"
    }
  }
];
