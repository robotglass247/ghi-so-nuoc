# STABLE CHECKPOINT – FAST6 SPEED2 BATCH

**Ngày xác nhận:** 2026-09-11

**Trạng thái:** STABLE – người dùng xác nhận test thực tế hơn 20 ảnh, hàng Chờ về 0, không có ảnh lỗi và không bị treo giữa chừng.

## Mục tiêu
Tăng tốc đồng bộ khi có hàng Chờ lớn bằng cách gom tối đa 5 ảnh trong một POST, đồng thời giữ đường upload 1 ảnh cũ làm fallback.

## Thành phần Stable
- Backend: `Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`
- SHA256 backend: `b6d77899d8a9ae372d7609cfc3c18eb91871b3e910e5a4db8e4b5f3d9f1296c7`
- Backup Drive Stable: `STABLE_2026-09-11_Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`
- Drive File ID Stable: `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`
- Trang test Batch: `https://robotglass247.github.io/ghi-so-nuoc/speed2-batch-test.html`
- Commit tạo trang test: `016f9902026a0c46c990425fb9bd8064e148ba33`
- Commit checkpoint candidate trước đó: `2b9a9ea2d333ad9255778d447edf7e3bf7779ccd`

## Kiến trúc SPEED2
- API mới: `api=batchupload`.
- Tối đa 5 ảnh/request.
- Mỗi batch mở Spreadsheet một lần, đọc danh mục/nhân sự/log/hàng đợi theo khối.
- Ghi `HANG_DOI_ANH_V87` và `NHAT_KY_DONG_BO` theo khối.
- File ảnh Batch dùng Client ID để retry không tạo trùng ngoài ý muốn.
- Upload 1 ảnh cũ vẫn giữ nguyên làm fallback.
- FAST6 camera/QR/IndexedDB/Offline/Service Worker không bị sửa bởi trang test Batch.

## Kết quả test người dùng xác nhận
- PASS – test thực tế hơn 20 ảnh.
- PASS – `Chờ = 0` sau khi đồng bộ.
- PASS – không có ảnh lỗi.
- PASS – không bị treo giữa chừng.
- PASS – luồng Batch xử lý được hàng Chờ lớn thực tế.

## Chưa định lượng riêng
- Chưa ghi số đo giây/ảnh hoặc tổng thời gian chính xác của lượt >20 ảnh này. Nếu cần tối ưu tiếp, phải đo từ `NHAT_KY_DONG_BO`/thời gian thực tế trước khi thay đổi thêm.

## Rollback
- Mốc rollback gần nhất: SPEED1 Stable.
- Backend rollback: `STABLE_2026-09-11_Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`.
- Drive File ID SPEED1 Stable: `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.
- Nếu SPEED2 phát sinh lỗi về sau, deploy lại nguyên backend SPEED1 Stable; không sửa chồng lên SPEED2 đang lỗi.

## Quy tắc thay đổi tiếp theo
- Trước mọi chỉnh sửa SPEED2 phải đối chiếu checkpoint này.
- Tạo PENDING riêng, không sửa trực tiếp bản Stable.
- Không xóa IndexedDB/ảnh Chờ để xử lý lỗi.
- Chỉ nâng PENDING mới thành Stable sau khi người dùng test và xác nhận.
