# PENDING CHECKPOINT – FAST6 STAFF3 FASTSTAFF

**Ngày:** 2026-09-12

**Trạng thái:** PENDING TEST. Chưa thay `water-offline-sw.js` đang chạy chính.

## Mục tiêu
Giảm độ trễ cập nhật nhân sự không ổn định (>70 giây trong một số lượt) xuống mức nhanh nhất thực tế mà không ảnh hưởng camera/QR/Offline/SPEED3.

## Backend PENDING
- File local/user artifact: `PENDING_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF3_FASTSTAFF_FULL.txt`
- SHA256: `21d6688d567c1e99e81482cce4d51462222677b3082a30aa18ba8ea8f055dcb3`
- Thêm POST `api=staffonly`.
- `staffonly` chỉ mở Sheet và gọi `layDanhSachNhanSuWeb_()`; không chạy `waterProgressData_()`.
- Response: `WATER_STAFF_ONLY`, có `requestId`, `staff`, `serverMs`.
- SPEED3 upload/batch/turbo giữ nguyên.

## Frontend / Service Worker candidate
- Repo path: `pending/water-offline-sw-staff3-fast.js`
- Commit: `266017925b2d425b20391ebdac39293386481070`
- SHA256 local candidate: `c4bf9806fd84b9dcdaf3d29294993d172258eeebfac4c1c427f0b2968ff1d1f8`
- Cache candidate: `water-v878-offline-fast6-staff3`.
- Mở ĐỔI NHÂN SỰ gọi ngay `staffonly`.
- Khi modal nhân sự đang mở, kiểm tra khoảng 4 giây/lần nhưng chỉ 1 request hoạt động tại một thời điểm.
- Danh sách chỉ hiển thị `Họ và tên`; mã nhân sự vẫn giữ trong option value để lưu backend.
- Select cao 34 px, chiều ngang đo theo tên dài nhất và giới hạn theo màn hình.

## Trang benchmark
- `https://robotglass247.github.io/ghi-so-nuoc/staff3-fast-test.html`
- Commit: `4bb23afe40f0b7fd760529ed5cecfddbf178e07b`
- Hiển thị tổng thời gian phản hồi và `serverMs` backend.
- Tự kiểm tra mỗi 4 giây, không gửi chồng request.

## Điều kiện test
1. Người dùng thay full `Ma.gs` bằng backend STAFF3 PENDING và Deploy → Manage deployments → Edit → New version → Deploy.
2. Mở `staff3-fast-test.html`.
3. Xác nhận PASS và ghi nhận thời gian nhiều lượt, gồm sau khi thay trạng thái nhân sự trên Sheet.
4. Nếu ổn định, mới thay `water-offline-sw.js` chính bằng candidate STAFF3.
5. Regression camera/Online/Offline/queue trước khi nâng Stable.

## Rollback
- Service Worker chính hiện tại vẫn là STAFF2 PENDING/đang test; STAFF3 chưa overwrite.
- Backend Stable trước STAFF3: `STABLE_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF2_FULL.txt`, Drive ID `13s14v6STaLll504tfcL9ay-0DMbxYa4I`.
