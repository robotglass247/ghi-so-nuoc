# LATEST STABLE – GHI SỔ NƯỚC

**Cập nhật:** 2026-09-12

## Mốc Stable hiện tại
`STABLE-2026-09-12-FAST6-SPEED3-STAFF2`

- Checkpoint chi tiết: `checkpoints/STABLE_2026-09-12_FAST6_SPEED3_STAFF2.md`
- Lõi đồng bộ: SPEED3 TURBO Stable.
- Backend Stable: `STABLE_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF2_FULL.txt`
- SHA256 backend: `ee7ad42d06b2e409b8c0a1f80ee9338970cae11b7773779dbd2327f52ad319ef`
- Backup Drive Stable ID: `13s14v6STaLll504tfcL9ay-0DMbxYa4I`

## SPEED3 benchmark giữ nguyên
Test thực tế đã xác nhận:
- 22 ảnh
- 3 wave
- 5 batch
- 55,5 giây tổng
- 2,52 giây/ảnh
- 23,8 ảnh/phút
- Chờ = 0
- NHAT_KY_DONG_BO đủ 22 Client ID mới.

## STAFF2 Stable
- `NHAN_SU_THUC_HIEN!F2:F1000` chỉ cho chọn `Đang làm việc` / `Đã nghỉ việc`.
- App chỉ nhận nhân sự có trạng thái đúng `Đang làm việc`.
- `Đã nghỉ việc` hoặc để trống không lên danh sách App.
- Người dùng đã test đổi trạng thái và xác nhận App cập nhật ngay.
- Backup sheet trước sửa: `1EQ12X-mtp7PPq6SAF4L4-c_8jXrqabbvvJuCizQQRyg`.

## Frontend
- STAFF2 đã PASS qua `https://robotglass247.github.io/ghi-so-nuoc/staff2-app-test.html`.
- `v87-background.html` chưa bị overwrite trong bước chốt STAFF2 để giữ an toàn camera/Offline/SPEED3.
- Tích hợp trực tiếp STAFF2 vào URL chính sẽ làm ở vòng regression cuối.

## Rollback
- Backend trước STAFF2 / SPEED3: Drive ID `1DXzq6GoO4BCyoav_y9WF-OTGJlPd0Ykn`.
- SPEED2: Drive ID `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`.
- SPEED1: Drive ID `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.

## Quy tắc
Mọi thay đổi tiếp theo tạo PENDING riêng. Không sửa trực tiếp phần camera, QR, IndexedDB, Offline hoặc SPEED3 nếu không có lỗi thực tế. Trước khi thay `v87-background.html`, phải regression Online + Offline + camera + nhân sự + queue/đồng bộ.
