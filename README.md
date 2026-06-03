# GrabFood 3-way Complaint Router Chatbot

Prototype của **TeamA02 - Track C: GrabFood** cho mini-hackathon Day 06. App demo một chatbot tiếp nhận khiếu nại đơn hàng, dùng AI để triage, tạo structured ticket, route tới **store / driver / customer_support / ask_customer**, sau đó chờ HITL trước khi phản hồi khách.

## 1. Problem / bottleneck

Khi khách khiếu nại đơn GrabFood, thông tin thường thiếu hoặc mơ hồ: thiếu món, sai món, món bị đổ, chưa nhận đơn, hoặc hỏi hoàn tiền. Nếu bot tự kết luận lỗi thuộc về ai hoặc hứa hoàn tiền, rủi ro vận hành và trust rất cao. Bottleneck cần xử lý là **phân loại đúng vấn đề, thu đủ bằng chứng, và chuyển đúng bên xác nhận**.

## 2. Build slice

Cho khách hàng GrabFood có đơn đã giao, prototype dùng AI để phân loại một khiếu nại đơn hàng, tạo structured ticket, route tới bên cần xác nhận, và xử lý case thiếu thông tin bằng cách hỏi thêm hoặc chuyển CSKH.

Không build thanh toán thật, refund thật, kết nối Grab thật, hay hệ thống ticket thật.

## 3. AI decision

AI quyết định:

- `issue_type`: `missing_item`, `wrong_item`, `damaged_or_spilled_item`, `not_received`, `refund_status`, `unclear`
- `route_to`: `store`, `driver`, `customer_support`, `ask_customer`
- `confidence`: `high`, `medium`, `low`
- `missing_info`, câu hỏi cho khách/cửa hàng/tài xế, và `next_action`

Vị trí code chính:

- FE gọi triage: `src/App.tsx`
- Backend OpenRouter proxy: `server/index.ts`, `server/openRouter.ts`
- Prompt/version: `server/prompt.ts`
- Fallback rule-based: `src/logic/triage.ts`

## 4. Auto / Aug

Chọn **Conditional automation**.

AI tự triage trong case hẹp, nhưng không tự xử lý tiền và không tự kết luận lỗi. Human giữ vai trò reviewer/decider/rescuer:

- Store xác nhận tình trạng đóng gói.
- Driver xác nhận giao hàng.
- CSKH review case mâu thuẫn, thiếu bằng chứng, hoặc liên quan tiền.

## 5. Four paths

| Path | Prototype thể hiện gì |
|---|---|
| Happy | Khách báo thiếu món rõ ràng + có ảnh -> AI route store -> Store confirms -> CSKH review -> phản hồi khách |
| Low-confidence | Khách nói mơ hồ, thiếu bằng chứng -> AI hỏi thêm -> chưa route cứng |
| Failure | Khách nói chưa nhận đơn nhưng hệ thống báo delivered -> AI không kết luận tài xế sai -> chuyển CSKH review |
| Correction | Khách nhập lại khiếu nại rõ hơn -> AI cập nhật `issue_type` và `route_to` mới |

UI có 2 nút demo chính theo yêu cầu: **Happy path** và **Low-confidence**. Failure/correction có trong mock data, logic, eval và README để nhóm có thể nhập tay khi demo sâu hơn.

## 6. Test cases chính

### Happy path

Order `GF12345`: delivered, paid, có customer photo và receipt photo.

Complaint:

```text
Đơn của mình thiếu 1 ly trà sữa trân châu. Mình đã nhận cơm gà và khoai tây, nhưng không có trà sữa. Đây là ảnh các món đã nhận.
```

Expected:

```json
{
  "issue_type": "missing_item",
  "route_to": "store",
  "confidence": "high",
  "handoff_required": true,
  "next_action": "ask_store_to_confirm_packing"
}
```

### Low-confidence path

Order `GF67890`: delivered, paid, thiếu customer photo và receipt photo.

Complaint:

```text
Đơn này lỗi rồi, tôi muốn hoàn tiền.
```

Expected:

```json
{
  "issue_type": "unclear",
  "route_to": "ask_customer",
  "confidence": "low",
  "handoff_required": false,
  "next_action": "ask_customer_for_issue_detail_and_evidence"
}
```

## 7. OpenRouter, fallback và monitoring

Backend gọi OpenRouter qua `.env`, không đưa API key vào frontend. Cấu hình model:

- `OPENROUTER_MODELS_SIMPLE`: task đơn giản
- `OPENROUTER_MODELS_COMPLEX`: task dài hoặc có conflict

Mặc định dùng `openrouter/free` và model `:free` làm fallback. Nếu tất cả model lỗi, backend dùng `src/logic/triage.ts` để demo vẫn chạy.

Monitoring mỗi lần triage gồm:

- `request_id`
- provider/model/model candidates
- fallback status và fallback reason
- latency
- input/output/prompt token ước tính
- system prompt version, prompt variant, prompt hash
- structured ticket và raw model output

Log được lưu tại:

```text
monitoring/triage-events.jsonl
```

Trong UI, phần monitoring được tách thành các khối:

- **AI Runtime Pipeline:** cho biết AI đang ở bước nhận complaint, dựng prompt, gọi model, policy check, tạo ticket, hay chờ HITL.
- **Input intake:** issue type, route, confidence và summary.
- **Model routing:** provider, model đang dùng, danh sách model candidates.
- **Latency & tokens:** latency, input tokens, output tokens.
- **Prompt & guardrail:** system prompt version, prompt hash, fallback reason.
- **Output JSON:** structured ticket đầy đủ để copy.

## 8. Eval

Eval set nằm tại:

```text
src/data/evalCases.ts
docs/eval-monitoring.md
```

Chạy eval rule-based:

```bash
npm run eval
```

Hoặc bấm **Chạy eval nhanh** trong AI Triage Panel.

## 9. Vì sao không cho AI tự hoàn tiền

Hoàn tiền liên quan tiền, chính sách merchant, bằng chứng, trạng thái giao hàng và quyền lợi nhiều bên. Nếu AI tự hứa hoàn tiền khi thiếu xác nhận, hệ thống có thể tạo kỳ vọng sai cho khách và gây tranh chấp vận hành. Prototype chỉ dùng các cụm từ an toàn như “kiểm tra”, “yêu cầu hỗ trợ”, “chờ xác nhận”.

## 10. Vì sao cần HITL

Khiếu nại đơn ăn uống thường có nhiều nguồn dữ liệu không đồng nhất: lời khách, hóa đơn, ảnh món, ảnh giao hàng, phản hồi cửa hàng và phản hồi tài xế. HITL giúp kiểm tra trước khi có quyết định ảnh hưởng đến tiền, merchant score hoặc driver score.

## 11. Cách chạy project

```bash
npm install
npm run dev
```

Mở:

```text
http://localhost:5173
```

Backend chạy ở:

```text
http://localhost:8787
```

File `.env` đã được cấu hình local và được ignore khỏi git. Nếu clone lại repo, copy `.env.example` thành `.env` và điền OpenRouter key.

## 12. Demo script 3 phút

1. Mở dashboard, chỉ 4 panel: chat, triage JSON, order evidence, HITL.
2. Bấm **Happy path: thiếu món**. Chỉ ra AI tạo `issue_type=missing_item`, `route_to=store`, `confidence=high`.
3. Bấm **Store confirms missing item** hoặc **CSKH approves review** trong HITL panel. Chỉ ra bot phản hồi khách mà không tự hứa hoàn tiền.
4. Bấm **Low-confidence: mơ hồ**. Chỉ ra AI trả `route_to=ask_customer`, `confidence=low`, hỏi thêm bằng chứng.
5. Xem **AI Runtime Pipeline** và **Monitoring**: model, latency, token ước tính, prompt version/hash, fallback.
6. Bấm **Chạy eval nhanh** để chứng minh prototype có eval set tối thiểu.

## 13. Phân công TeamA02

| Thành viên | Vai trò |
|---|---|
| Trần Đức Đăng Khôi - 2A202600889 | Prototype lead, FE/BE integration, demo flow |
| Lê Thiên Khang - 2A202600726 | Research/evidence, mock order data, complaint samples |
| Nguyễn Thụy Như Quỳnh - 2A202600557 | Thin SPEC, guardrails, UX copy |
| Phạm Thành Nam - 2A202600832 | Eval/failure path, monitoring, demo script |
