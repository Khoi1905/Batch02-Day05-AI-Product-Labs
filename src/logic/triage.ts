import type { OrderData, TriageResult } from "../types";

const customerClarifyingQuestions = [
  "Đơn gặp lỗi gì: thiếu món, sai món, món bị đổ/hỏng, chưa nhận được đơn, hay chưa nhận hoàn tiền?",
  "Bạn có thể gửi ảnh món đã nhận hoặc ảnh hóa đơn/tem đơn không?"
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function hasAny(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(normalize(keyword)));
}

function extractReportedItems(complaintText: string, orderData: OrderData): string[] {
  const normalizedText = normalize(complaintText);
  return orderData.items
    .filter((item) => normalizedText.includes(normalize(item.name)))
    .map((item) => item.name);
}

function extractMissingItems(complaintText: string, orderData: OrderData): string[] {
  const normalizedText = normalize(complaintText);
  const missingMarkers = ["thieu", "khong co", "mat mon"];

  const matched = orderData.items.filter((item) => {
    const itemName = normalize(item.name);
    const itemIndex = normalizedText.indexOf(itemName);
    if (itemIndex < 0) return false;

    return missingMarkers.some((marker) => {
      const markerIndex = normalizedText.indexOf(marker);
      if (markerIndex < 0) return false;
      const segment = normalizedText.slice(markerIndex, itemIndex);
      const sameSentence = !/[.!?]/.test(segment);
      return itemIndex >= markerIndex && itemIndex - markerIndex <= 60 && sameSentence;
    });
  });

  return matched.map((item) => item.name);
}

function evidenceMissing(orderData: OrderData): string[] {
  const missing: string[] = [];
  if (!orderData.evidence.customer_photo) missing.push("customer_photo");
  if (!orderData.evidence.receipt_photo) missing.push("receipt_photo");
  return missing;
}

function buildSummary(issueLabel: string, complaintText: string, orderData: OrderData): string {
  return `${issueLabel} cho đơn ${orderData.order_id}: ${complaintText.trim()}`;
}

export function triageComplaint(complaintText: string, orderData: OrderData): TriageResult {
  const normalizedText = normalize(complaintText);
  const reportedItems = extractReportedItems(complaintText, orderData);
  const missingEvidence = evidenceMissing(orderData);

  const asksRefund = hasAny(normalizedText, ["hoàn tiền", "refund", "trả tiền", "hoan tien"]);
  const vagueComplaint = hasAny(normalizedText, ["đơn lỗi", "don loi", "có vấn đề", "co van de", "lỗi rồi", "loi roi"]);
  const missingItem = hasAny(normalizedText, ["thiếu", "thieu", "không có", "khong co", "mất món", "mat mon"]);
  const wrongItem = hasAny(normalizedText, [
    "sai món",
    "sai mon",
    "nhầm món",
    "nham mon",
    "khác món",
    "khac mon",
    "món khác",
    "mon khac",
    "nhận thành",
    "nhan thanh"
  ]);
  const damaged = hasAny(normalizedText, [
    "bị đổ",
    "bi do",
    "đổ ra",
    "do ra",
    "đổ hết",
    "do het",
    "vỡ",
    "vo",
    "hỏng",
    "hong",
    "rách",
    "rach",
    "bung",
    "tràn",
    "tran"
  ]);
  const notReceived = hasAny(normalizedText, ["chưa nhận", "chua nhan", "không nhận", "khong nhan", "không thấy đơn", "khong thay don"]);

  if ((vagueComplaint && asksRefund) || (!missingItem && !wrongItem && !damaged && !notReceived && asksRefund)) {
    return {
      issue_type: "unclear",
      summary: buildSummary("Khiếu nại chưa đủ rõ", complaintText, orderData),
      reported_items: reportedItems,
      route_to: "ask_customer",
      confidence: "low",
      missing_info: ["issue_detail", "customer_photo_or_receipt"],
      questions_to_customer: customerClarifyingQuestions,
      questions_to_store: [],
      questions_to_driver: [],
      handoff_required: false,
      handoff_reason: "Input chưa đủ rõ để tạo ticket cuối hoặc route sang một bên cụ thể.",
      next_action: "ask_customer_for_issue_detail_and_evidence",
      customer_message:
        "Mình cần thêm thông tin để hỗ trợ đúng vấn đề. Đơn của bạn gặp lỗi gì: thiếu món, sai món, món bị đổ/hỏng, chưa nhận được đơn, hay đang chờ hoàn tiền? Nếu có thể, bạn hãy gửi thêm ảnh món đã nhận hoặc ảnh hóa đơn/tem đơn."
    };
  }

  if (missingItem && orderData.order_status === "delivered") {
    const missingReportedItems = extractMissingItems(complaintText, orderData);
    const confidence = missingEvidence.length === 0 && reportedItems.length > 0 ? "high" : "medium";
    return {
      issue_type: "missing_item",
      summary: buildSummary("Khách báo thiếu món", complaintText, orderData),
      reported_items: missingReportedItems.length > 0 ? missingReportedItems : reportedItems,
      route_to: "store",
      confidence,
      missing_info: missingEvidence,
      questions_to_customer: missingEvidence.length > 0 ? customerClarifyingQuestions.slice(1) : [],
      questions_to_store: ["Cửa hàng vui lòng xác nhận đơn này đã được đóng đủ các món trong hóa đơn chưa?"],
      questions_to_driver: [],
      handoff_required: true,
      handoff_reason: "Store needs to confirm packing status before CSKH review",
      next_action: "ask_store_to_confirm_packing",
      customer_message: `Mình đã ghi nhận khiếu nại thiếu ${(missingReportedItems[0] ?? reportedItems[0]) || "món trong đơn"} trong đơn ${orderData.order_id}. Cửa hàng sẽ được yêu cầu xác nhận tình trạng đóng gói. Yêu cầu này sẽ được CSKH kiểm tra trước khi có phương án hỗ trợ tiếp theo.`
    };
  }

  if (wrongItem) {
    return {
      issue_type: "wrong_item",
      summary: buildSummary("Khách báo nhận sai món", complaintText, orderData),
      reported_items: reportedItems,
      route_to: "store",
      confidence: orderData.evidence.customer_photo ? "medium" : "low",
      missing_info: orderData.evidence.customer_photo ? ["receipt_photo_if_available"] : ["customer_photo", "receipt_photo_if_available"],
      questions_to_customer: ["Bạn có thể gửi ảnh món đã nhận và ảnh hóa đơn/tem đơn nếu có không?"],
      questions_to_store: ["Cửa hàng vui lòng kiểm tra món đã chuẩn bị so với hóa đơn của đơn này."],
      questions_to_driver: [],
      handoff_required: true,
      handoff_reason: "Store needs to compare prepared item with receipt before CSKH review",
      next_action: "ask_store_to_check_wrong_item",
      customer_message: `Mình đã ghi nhận phản ánh nhận sai món cho đơn ${orderData.order_id}. Cần cửa hàng xác nhận thông tin chuẩn bị món và CSKH sẽ kiểm tra trước khi có hướng hỗ trợ.`
    };
  }

  if (notReceived && orderData.order_status === "delivered") {
    return {
      issue_type: "not_received",
      summary: buildSummary("Khách báo chưa nhận đơn nhưng hệ thống đã giao", complaintText, orderData),
      reported_items: reportedItems,
      route_to: "customer_support",
      confidence: orderData.evidence.driver_dropoff_photo ? "medium" : "medium",
      missing_info: orderData.evidence.driver_dropoff_photo ? ["customer_confirmation"] : ["driver_dropoff_photo", "customer_confirmation"],
      questions_to_customer: ["Bạn có thể xác nhận địa chỉ/điểm nhận và thời điểm bạn kiểm tra đơn không?"],
      questions_to_store: [],
      questions_to_driver: ["Tài xế vui lòng xác nhận thời điểm và địa điểm giao đơn, kèm bằng chứng giao nếu có."],
      handoff_required: true,
      handoff_reason: "Order status conflicts with customer claim; CSKH must review without assigning fault",
      next_action: "customer_support_review_delivery_conflict",
      customer_message: `Mình đã ghi nhận việc bạn chưa nhận được đơn ${orderData.order_id} trong khi hệ thống đang hiển thị đã giao. CSKH sẽ kiểm tra cùng thông tin từ tài xế và bằng chứng giao hàng trước khi phản hồi tiếp theo.`
    };
  }

  if (damaged) {
    const packagingRelated = hasAny(normalizedText, ["hộp bung", "hop bung", "đóng gói", "dong goi", "nắp", "nap"]);
    const deliveryRelated = hasAny(normalizedText, ["túi rách", "tui rach", "giao đổ", "giao do", "nghiêng", "nghieng"]);
    const routeTo = packagingRelated ? "store" : deliveryRelated ? "driver" : "customer_support";
    return {
      issue_type: "damaged_or_spilled_item",
      summary: buildSummary("Khách báo món bị đổ/hỏng", complaintText, orderData),
      reported_items: reportedItems,
      route_to: routeTo,
      confidence: routeTo === "customer_support" ? "low" : "medium",
      missing_info: orderData.evidence.customer_photo ? [] : ["customer_photo"],
      questions_to_customer: orderData.evidence.customer_photo ? [] : ["Bạn có thể gửi ảnh tình trạng món/túi/hộp khi nhận không?"],
      questions_to_store: routeTo === "store" ? ["Cửa hàng vui lòng xác nhận tình trạng đóng gói của đơn này."] : [],
      questions_to_driver: routeTo === "driver" ? ["Tài xế vui lòng xác nhận tình trạng túi/hộp khi giao đơn."] : [],
      handoff_required: true,
      handoff_reason: "Damaged/spilled complaint needs human confirmation before any support decision",
      next_action: routeTo === "customer_support" ? "customer_support_review_damage_claim" : `ask_${routeTo}_to_confirm_condition`,
      customer_message: `Mình đã ghi nhận phản ánh món bị đổ/hỏng trong đơn ${orderData.order_id}. Thông tin này cần được xác nhận thêm trước khi CSKH đề xuất phương án hỗ trợ.`
    };
  }

  if (asksRefund) {
    return {
      issue_type: "refund_status",
      summary: buildSummary("Khách hỏi trạng thái hoàn tiền", complaintText, orderData),
      reported_items: reportedItems,
      route_to: "customer_support",
      confidence: "medium",
      missing_info: ["refund_request_context"],
      questions_to_customer: ["Bạn đang hỏi trạng thái yêu cầu hỗ trợ nào, hoặc đơn gặp vấn đề gì cần CSKH kiểm tra?"],
      questions_to_store: [],
      questions_to_driver: [],
      handoff_required: true,
      handoff_reason: "Money-related support needs CSKH review and cannot be promised automatically",
      next_action: "customer_support_review_refund_status",
      customer_message: `Mình sẽ chuyển yêu cầu liên quan hoàn tiền của đơn ${orderData.order_id} để CSKH kiểm tra. Mình chưa thể xác nhận kết quả hoàn tiền cho đến khi yêu cầu được xem xét.`
    };
  }

  return {
    issue_type: "unclear",
    summary: buildSummary("Khiếu nại chưa phân loại được", complaintText, orderData),
    reported_items: reportedItems,
    route_to: "ask_customer",
    confidence: "low",
    missing_info: ["issue_detail"],
    questions_to_customer: customerClarifyingQuestions,
    questions_to_store: [],
    questions_to_driver: [],
    handoff_required: false,
    handoff_reason: "Complaint text does not contain enough signal for a safe route.",
    next_action: "ask_customer_for_issue_detail",
    customer_message:
      "Mình cần thêm thông tin để hỗ trợ đúng vấn đề. Đơn của bạn gặp lỗi gì: thiếu món, sai món, món bị đổ/hỏng, chưa nhận được đơn, hay đang chờ hoàn tiền?"
  };
}
