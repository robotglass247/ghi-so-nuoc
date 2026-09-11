# STABLE CHECKPOINT – FAST6 SPEED2 BATCH

**Ngày xác nhận:** 2026-09-11

**Trạng thái:** STABLE – đã được người dùng test cô lập trực tiếp trên trang SPEED2 Batch.

## Bằng chứng test thực tế
- Trang test: `https://robotglass247.github.io/ghi-so-nuoc/speed2-batch-test.html`
- Kết quả hiển thị trực tiếp trên trang:
  - Ảnh: **15**
  - Batch: **3**
  - Tổng thời gian: **84,0 giây**
  - Trung bình: **5,60 giây/ảnh**
  - `Chờ = 0`
- Người dùng xác nhận: không có ảnh lỗi, không treo giữa chừng.
- Đây là benchmark chuẩn để so sánh SPEED3 trở đi.

## Backend SPEED2 Stable
- Backend: `Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`
- SHA256: `b6d77899d8a9ae372d7609cfc3c18eb91871b3e910e5a4db8e4b5f3d9f1296c7`
- API Batch: `api=batchupload`
- Tối đa 5 ảnh/request.
- Upload đơn FAST6 cũ vẫn giữ làm fallback.
- Backup Drive Stable ID: `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`.

## Kiến trúc đã PASS
- Camera/QR/Offline/IndexedDB của FAST6 không bị sửa.
- Trang Batch dùng chung IndexedDB `water_meter_v6/queue`.
- Chỉ xóa từng Client ID local sau ACK `ok=true`.
- Backend đọc danh mục/nhân sự/ID theo lô và ghi Sheet theo khối.
- Client ID tiếp tục chống trùng.

## Rollback gần nhất
Nếu tối ưu SPEED3 gặp lỗi:
1. Deploy lại nguyên backend SPEED2 Stable ở trên.
2. Dùng trang `speed2-batch-test.html` để đồng bộ Batch 5 ảnh/lần.
3. Nếu cần lùi sâu hơn nữa, SPEED1 Stable vẫn còn backup Drive ID `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.

## Quy tắc phát triển tiếp
- SPEED3 phải là PENDING riêng.
- Không sửa trực tiếp SPEED2 Stable.
- Chỉ nâng SPEED3 thành Stable nếu test tối thiểu 15–20 ảnh, `Chờ = 0`, không lỗi/trùng/mất ảnh và tốc độ nhanh hơn rõ rệt so với **5,60 giây/ảnh**.
