# Thin SPEC — GrabFood 3-way Complaint Router

## 1. Track, product/app và user

**Track:** Track C - GrabFood  
**Product/app thật:** GrabFood  
**User cụ thể:** Khách hàng GrabFood có đơn đã giao và muốn khiếu nại lỗi đơn hàng.  
**Nhóm có phải user thật không? Nếu không, khác ở đâu?** Nhóm có thể đóng vai khách hàng dùng GrabFood, nhưng dữ liệu complaint/evidence trong prototype là mock. Cần kiểm chứng thêm bằng review hoặc self-use thật trước checkpoint demo.

## 2. Evidence summary

| Evidence | Nguồn | User/pain nói lên điều gì? | SPEC phải đổi gì? |
|---|---|---|---|
| Khách báo thiếu món nhưng cần đối chiếu hóa đơn, ảnh món nhận, và xác nhận cửa hàng | Mock self-use scenario | User cần kênh ghi nhận nhanh, nhưng hệ thống không nên tự kết luận cửa hàng sai | Route `missing_item` tới store, bắt buộc HITL |
| Khách nói “đơn lỗi rồi, muốn hoàn tiền” nhưng không nói lỗi gì | Mock complaint sample | Input mơ hồ dễ khiến bot xử lý quá tay | `confidence=low`, `route_to=ask_customer`, hỏi thêm |
| Khách nói chưa nhận đơn trong khi hệ thống báo delivered | Mock failure scenario | Có conflict giữa status hệ thống và lời khách | Route CSKH, hỏi tài xế xác nhận, không kết luận lỗi |
| Case liên quan hoàn tiền có rủi ro kỳ vọng sai | Product risk assumption | AI không được hứa chắc chắn refund | Tất cả money-related action phải qua CSKH/HITL |

## 3. Pain statement

```text
User khách hàng GrabFood đang gặp khó ở bước báo lỗi đơn hàng sau khi đơn hiển thị đã giao,
vì khiếu nại thường thiếu bằng chứng hoặc mâu thuẫn với trạng thái hệ thống,
dẫn tới ticket dễ route sai hoặc tạo kỳ vọng sai về hoàn tiền.
Bằng chứng chính là mock complaint/evidence set của nhóm và cần được kiểm chứng bằng review/self-use thật.
```

## 4. Build slice

```text
Cho khách hàng GrabFood đang báo lỗi đơn đã giao,
prototype sẽ dùng AI để phân loại khiếu nại và route ticket tới store/driver/CSKH/ask_customer,
tạo ra structured ticket kèm câu hỏi xác nhận,
và xử lý failure mode thiếu thông tin hoặc dữ liệu mâu thuẫn bằng hỏi thêm hoặc chuyển CSKH review.
```

## 5. Auto/Aug decision

- [ ] Augmentation: AI gợi ý/draft/phân loại, user quyết cuối.
- [x] Conditional automation: AI tự làm trong case hẹp; case mơ hồ/rủi ro chuyển người.
- [ ] Automation: AI tự quyết và tự hành động.

**Lý do chọn:** AI có thể phân loại và route nhanh, nhưng không nên tự quyết tiền, merchant fault, driver fault.  
**Human role:** reviewer / decider / rescuer.

## 6. Four paths

| Path | Prototype phải thể hiện gì? |
|---|---|
| Happy | Thiếu món rõ ràng + có ảnh -> `missing_item`, `store`, `high`, HITL store confirm |
| Low-confidence | Complaint mơ hồ + thiếu evidence -> `unclear`, `ask_customer`, `low`, hỏi thêm |
| Failure | Chưa nhận đơn nhưng status delivered -> `not_received`, `customer_support`, không kết luận tài xế sai |
| Correction | Khách nhập lại complaint rõ hơn -> AI cập nhật ticket và route mới |

## 7. Failure mode nguy hiểm nhất

```text
Nếu user hỏi hoàn tiền hoặc nói tài xế/cửa hàng gây lỗi,
AI có thể kết luận trách nhiệm hoặc hứa chắc chắn hoàn tiền,
hậu quả là khách có kỳ vọng sai và gây tranh chấp với merchant/driver.
Prototype sẽ xử lý bằng guardrail: không hứa refund, không quy lỗi, chuyển CSKH/HITL khi liên quan tiền hoặc dữ liệu mâu thuẫn.
Owner kiểm thử path này là Phạm Thành Nam.
```

## 8. Owner plan cho sáng Day 06

| Thành viên | Việc phụ trách | Bằng chứng cần có trong repo |
|---|---|---|
| Trần Đức Đăng Khôi - 2A202600889 | Prototype FE/BE, tích hợp OpenRouter, demo happy path | Source code, screenshot dashboard nếu có |
| Lê Thiên Khang - 2A202600726 | Research/evidence, mock order/complaint data | `src/data/mockOrders.ts`, evidence notes |
| Nguyễn Thụy Như Quỳnh - 2A202600557 | Thin SPEC, guardrails, UX copy tiếng Việt | SPEC, README, customer messages |
| Phạm Thành Nam - 2A202600832 | Eval, monitoring, failure path test | `src/data/evalCases.ts`, `docs/eval-monitoring.md`, logs |
