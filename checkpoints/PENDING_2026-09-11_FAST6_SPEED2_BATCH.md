# PENDING CHECKPOINT – FAST6 SPEED2 BATCH

**Ngày tạo:** 2026-09-11

**Trạng thái:** PENDING TEST – không thay thế SPEED1 Stable.

## Mục tiêu
Tăng tốc mạnh khi có hàng Chờ lớn bằng cách gom tối đa 5 ảnh trong một POST thay vì khởi động Apps Script riêng cho từng ảnh.

## Giữ nguyên mốc Stable
- FAST6/SPEED1 Stable không bị sửa trực tiếp.
- Upload 1 ảnh hiện tại vẫn giữ nguyên làm fallback.
- Service Worker/camera/QR/IndexedDB/Offline không thay đổi.

## Backend candidate
- File: `Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`
- SHA256: `b6d77899d8a9ae372d7609cfc3c18eb91871b3e910e5a4db8e4b5f3d9f1296c7`
- Drive backup ID: `137wzLhy7FdXTHd-5XYF4MGROoN_LEAie`
- Thêm API mới `api=batchupload`; API upload 1 ảnh cũ giữ nguyên.
- Tối đa 5 ảnh/request.
- Mỗi batch chỉ mở Spreadsheet 1 lần, đọc danh mục 1 lần, đọc nhân sự 1 lần, đọc ID log/hàng đợi 1 lần.
- Ghi `HANG_DOI_ANH_V87` và `NHAT_KY_DONG_BO` theo khối.
- File ảnh Batch dùng tên theo Client ID để retry không nhân bản nếu Drive đã tạo file nhưng Sheet chưa kịp ghi.

## Trang test riêng
- `https://robotglass247.github.io/ghi-so-nuoc/speed2-batch-test.html`
- Commit tạo trang: `016f9902026a0c46c990425fb9bd8064e148ba33`
- Dùng chung IndexedDB `water_meter_v6/queue` trên cùng trình duyệt.
- Chỉ xóa local từng Client ID khi backend trả ACK `ok=true` cho đúng ảnh.
- Nếu batch có lỗi, ảnh chưa ACK vẫn giữ nguyên trong Chờ và có thể quay lại FAST6 Stable để gửi theo cách cũ.

## Tiêu chí PASS
- Tạo ít nhất 10–20 ảnh Chờ.
- Batch gửi hết, Chờ = 0.
- `HANG_DOI_ANH_V87` và `NHAT_KY_DONG_BO` đủ Client ID.
- Không mất ảnh, không sinh trùng Client ID.
- Đo tổng thời gian và giây/ảnh; phải nhanh hơn SPEED1 rõ rệt.

## Rollback
- Backend Stable: `STABLE_2026-09-11_Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`
- Drive File ID Stable: `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`
- Nếu SPEED2 lỗi: deploy lại nguyên file SPEED1 Stable và tiếp tục dùng FAST6 cũ.
