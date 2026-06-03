import type { DemoCase, OrderData } from "../types";

export const mockOrders: OrderData[] = [
  {
    order_id: "GF12345",
    order_status: "delivered",
    payment_status: "paid",
    driver_status: "delivered",
    delivery_status: "delivered",
    merchant_name: "Cơm Gà Tân Bình",
    customer_name: "Minh Anh",
    items: [
      { name: "Cơm gà", quantity: 1 },
      { name: "Trà sữa trân châu", quantity: 1 },
      { name: "Khoai tây chiên", quantity: 1 }
    ],
    evidence: {
      customer_photo: true,
      receipt_photo: true,
      driver_dropoff_photo: true,
      merchant_receipt_match: true
    }
  },
  {
    order_id: "GF67890",
    order_status: "delivered",
    payment_status: "paid",
    driver_status: "delivered",
    delivery_status: "delivered",
    merchant_name: "Bún Bò Huế An Hòa",
    customer_name: "Gia Huy",
    items: [
      { name: "Bún bò", quantity: 1 },
      { name: "Trà đá", quantity: 1 }
    ],
    evidence: {
      customer_photo: false,
      receipt_photo: false,
      driver_dropoff_photo: true,
      merchant_receipt_match: false
    }
  },
  {
    order_id: "GF24680",
    order_status: "delivered",
    payment_status: "paid",
    driver_status: "delivered",
    delivery_status: "not_received_claim",
    merchant_name: "Mì Ý Corner",
    customer_name: "Hoàng Nam",
    items: [
      { name: "Mì Ý bò bằm", quantity: 1 },
      { name: "Súp nấm", quantity: 1 }
    ],
    evidence: {
      customer_photo: false,
      receipt_photo: true,
      driver_dropoff_photo: false,
      merchant_receipt_match: true
    }
  }
];

export const demoCases: DemoCase[] = [
  {
    id: "happy_missing_item",
    label: "Happy path: thiếu món",
    orderId: "GF12345",
    complaint:
      "Đơn của mình thiếu 1 ly trà sữa trân châu. Mình đã nhận cơm gà và khoai tây, nhưng không có trà sữa. Đây là ảnh các món đã nhận."
  },
  {
    id: "low_confidence",
    label: "Low-confidence: mơ hồ",
    orderId: "GF67890",
    complaint: "Đơn này lỗi rồi, tôi muốn hoàn tiền."
  }
];

export function getOrderById(orderId: string): OrderData {
  const order = mockOrders.find((item) => item.order_id === orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }
  return order;
}
