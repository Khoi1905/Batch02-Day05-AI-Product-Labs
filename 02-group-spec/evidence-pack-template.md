# Evidence Pack — TeamA02 GrabFood Complaint Router

## 1. Nhóm và track

**Tên nhóm:** TeamA02  
**Track:** Track C - GrabFood  
**Product/app đã chọn:** GrabFood  
**Build slice đang nghĩ:** Chatbot triage khiếu nại đơn hàng, tạo structured ticket và route tới store/driver/CSKH/ask_customer.

## 2. Self-use evidence

| Observation | Screenshot/link | Path liên quan | Điều học được |
|---|---|---|---|
| Khách báo thiếu món nhưng cần ảnh món nhận và hóa đơn để xác minh | Mock scenario `GF12345` | Happy | AI có thể route store, nhưng cần store/CSKH xác nhận trước khi xử lý |
| Khách nói “đơn lỗi rồi, muốn hoàn tiền” nhưng không mô tả lỗi | Mock scenario `GF67890` | Low-confidence | Bot phải hỏi thêm, không route cứng và không hứa refund |
| Khách nói chưa nhận đơn dù order status là delivered | Mock scenario `GF24680` | Failure | Đây là conflict dữ liệu, cần CSKH review và hỏi tài xế xác nhận |

## 3. User / review / social evidence

| Quote / review / observation | Nguồn | User là ai? | Pain/failure mode |
|---|---|---|---|
| “Đơn này lỗi rồi, tôi muốn hoàn tiền.” | Mock complaint sample | Khách đặt đồ ăn | Intent mơ hồ, thiếu evidence |
| “App báo đã giao nhưng tôi chưa nhận được đơn.” | Mock failure sample | Khách đặt đồ ăn | Conflict giữa hệ thống và lời khách |
| “Thiếu trà sữa trong đơn, tôi có ảnh món đã nhận.” | Mock happy sample | Khách đặt đồ ăn | Có thể triage nhanh nhưng vẫn cần xác nhận cửa hàng |

Đây là giả định/mock data. Nhóm sẽ kiểm bằng self-use thật, review app store/social post, hoặc phỏng vấn nhanh trước checkpoint M1 Day 06.

## 4. Competitor / analog evidence

| App / mô hình tham khảo | Họ xử lý task này thế nào? | Pattern học được | Có áp dụng trong 1 ngày không? |
|---|---|---|---|
| Food delivery support flow | Hỏi loại lỗi, yêu cầu ảnh, chuyển ticket | Structured intake + evidence checklist | Có |
| CS chatbot có confidence fallback | Khi thiếu thông tin thì hỏi lại hoặc chuyển người | Low-confidence path cần rõ ràng | Có |
| Refund workflow | Cần review chính sách và bằng chứng | AI không nên tự quyết tiền | Có |

## 5. Evidence -> Insight

```text
Evidence nổi bật nhất:
Nhiều complaint có vẻ đơn giản nhưng thực ra cần đối chiếu bằng chứng và phản hồi từ merchant/driver/CSKH.

Insight:
User không chỉ cần “chat với support”.
Họ thật ra cần được ghi nhận đúng vấn đề và biết hệ thống đang cần bằng chứng/xác nhận nào,
vì nếu bot trả lời quá tự tin hoặc hứa hoàn tiền, trust và vận hành đều rủi ro.

Opportunity:
AI có thể giúp bằng cách phân loại và route ticket trong case hẹp,
giúp CSKH/store/driver nhận đúng câu hỏi cần xác nhận,
trong khi vẫn kiểm soát rủi ro bằng confidence, fallback và HITL.
```

## 6. Evidence đổi SPEC như thế nào?

- [x] Đổi user chính.
- [x] Đổi pain statement.
- [x] Đổi build slice.
- [x] Đổi Auto/Aug decision.
- [x] Đổi 4 paths.
- [x] Đổi failure mode.
- [x] Đổi owner/test plan.

```text
Trước evidence, nhóm có thể nghĩ bot chỉ cần trả lời khiếu nại.
Sau evidence, nhóm đổi thành complaint router có structured ticket, confidence, evidence checklist và HITL.
Lý do:
Khiếu nại giao đồ ăn có nhiều bên liên quan và dễ tạo kỳ vọng sai nếu AI tự kết luận hoặc tự hứa hoàn tiền.
```
