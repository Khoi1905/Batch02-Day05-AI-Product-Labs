# Mock Data Chuẩn Bị Cho Demo

## Orders

Mock orders nằm trong:

```text
src/data/mockOrders.ts
```

### GF12345

Happy path thiếu món:

- Status: delivered
- Payment: paid
- Có customer photo
- Có receipt photo
- Items: Cơm gà, Trà sữa trân châu, Khoai tây chiên

### GF67890

Low-confidence path:

- Status: delivered
- Payment: paid
- Thiếu customer photo
- Thiếu receipt photo
- Items: Bún bò, Trà đá

### GF24680

Failure path:

- Status: delivered
- Customer claim: chưa nhận đơn
- Thiếu driver dropoff proof
- Items: Mì Ý bò bằm, Súp nấm

## Complaint samples

Happy:

```text
Đơn của mình thiếu 1 ly trà sữa trân châu. Mình đã nhận cơm gà và khoai tây, nhưng không có trà sữa. Đây là ảnh các món đã nhận.
```

Low-confidence:

```text
Đơn này lỗi rồi, tôi muốn hoàn tiền.
```

Failure:

```text
App báo đã giao nhưng tôi chưa nhận được đơn, cũng không thấy ảnh giao hàng.
```

Correction:

```text
Không phải thiếu món, mình nhận sai món. Mình đặt cơm gà nhưng nhận món khác.
```

## Nhóm cần bổ sung nếu có thời gian

- Screenshot hoặc observation thật từ flow hỗ trợ của GrabFood.
- 1-2 review/comment public về thiếu món, giao nhầm, hoặc hoàn tiền.
- Ảnh mock cho customer photo/receipt nếu muốn UI trực quan hơn.
