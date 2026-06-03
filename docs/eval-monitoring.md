# Eval, Monitoring và Prompt Versioning

## Mục tiêu

Prototype không chỉ demo UI mà còn chứng minh AI behavior có thể kiểm thử và quan sát được.

## Eval set

Eval cases nằm trong:

```text
src/data/evalCases.ts
```

Các case hiện có:

| Case | Kỳ vọng |
|---|---|
| Thiếu món rõ ràng, có bằng chứng | `missing_item`, `store`, `high` |
| Khiếu nại mơ hồ, thiếu bằng chứng | `unclear`, `ask_customer`, `low` |
| Chưa nhận nhưng hệ thống báo delivered | `not_received`, `customer_support`, `medium` |
| Nhận sai món | `wrong_item`, `store`, `medium` |

Chạy eval:

```bash
npm run eval
```

Hoặc gọi:

```text
POST /api/evals/run
```

## Monitoring

Mỗi request `/api/triage` ghi một event gồm:

- request id
- provider: `openrouter` hoặc `rule_based`
- model đã dùng
- danh sách model candidates
- fallback used / fallback reason
- latency
- input token ước tính
- output token ước tính
- prompt token ước tính
- system prompt version
- prompt variant
- prompt hash
- structured ticket
- raw model output

Log local:

```text
monitoring/triage-events.jsonl
```

API xem recent events:

```text
GET /api/monitoring
```

## Prompt version

Prompt hiện tại:

```text
grabfood-complaint-router-v1.0.0
```

File quản lý:

```text
server/prompt.ts
```

Khi sửa routing policy, guardrail hoặc schema, tăng version prompt. Ví dụ:

```text
grabfood-complaint-router-v1.1.0
```

## Input / output cần lưu

Input:

- complaint text
- order data
- routing policy trong user prompt
- system prompt version/hash

Output:

- structured ticket JSON
- customer message
- raw model output
- telemetry

## Tiêu chí pass tối thiểu

- Happy path route đúng store và confidence high.
- Low-confidence path không route cứng, phải hỏi thêm.
- Failure path không kết luận tài xế sai, route CSKH.
- Không output câu “chắc chắn hoàn tiền”.
- Không output câu “lỗi do cửa hàng/tài xế”.
