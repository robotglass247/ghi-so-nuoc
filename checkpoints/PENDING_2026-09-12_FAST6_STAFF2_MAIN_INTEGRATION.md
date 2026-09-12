# PENDING CHECKPOINT – FAST6 STAFF2 MAIN INTEGRATION

**Ngày:** 2026-09-12

**Trạng thái:** PENDING TEST trên URL chính. Chưa nâng Stable.

## Mục tiêu
Đưa lớp nhân sự STAFF2 đã test PASS vào URL chính `v87-background.html` mà không sửa file lõi HTML/camera/QR/IndexedDB/SPEED3.

## Nguyên nhân phải tích hợp lại
- `staff2-app-test.html` đã PASS với POST `api=uistate`.
- URL chính trước thay đổi vẫn dùng Service Worker FAST6 cũ, vá nhân sự bằng GET/JSONP/iframe qua deployment NE.
- Vì vậy thay đổi trạng thái nhân sự không cập nhật như bản STAFF2 test.

## Rollback trước thay đổi
- File: `water-offline-sw.js`
- Blob SHA trước STAFF2: `349594da93e543d129b8950102d76546d5c1ad68`
- Backup repo: `backups/2026-09-12_water-offline-sw_FAST6_BEFORE_STAFF2.js`
- Backup commit: `1a10900ed9ca42d947ca57eae40e1470aab5a872`

## Candidate STAFF2 Service Worker
- Candidate: `water-offline-sw-staff2-pending.js`
- Candidate commit: `19c3e099a3ac2e5c0f165a142cfca4dd69b0fe32`
- SHA256 candidate: `0979baca8e9d66da5a7939b94678505bed96b1098ab7bad83b3eb5a0d0fb9edf`
- `node --check`: PASS.

## Tích hợp PENDING vào đường chạy chính
- `water-offline-sw.js` được thay bằng candidate STAFF2.
- Commit: `364e114a889c728f6d51f384cac28d2f98275311`
- Blob SHA mới: `550b1e105a856d76d68f0b43cb934f179f89f190`
- `v87-background.html` không sửa.

## Quy tắc STAFF2 trên link chính
- Nhân sự Online lấy bằng POST `api=uistate` từ backend AH/SPEED3.
- Chỉ backend trả nhân sự `Đang làm việc`.
- Cache nhân sự mới: `water_staff_list_staff2_v1`.
- Không dùng fallback nhân sự tĩnh để tránh hiện người đã nghỉ việc.
- Offline dùng cache danh sách Đang làm việc từ lần Online gần nhất.
- Nếu mã nhân sự đang chọn không còn trong danh sách trả về, App xóa lựa chọn cũ và yêu cầu chọn lại.
- Cache Service Worker mới: `water-v878-offline-fast6-staff2`.

## Không thay đổi
- `v87-background.html`
- Camera / QR
- IndexedDB queue
- Offline ảnh
- BACKEND_URL upload
- SPEED3 Turbo

## Điều kiện PASS để nâng Stable
Test trực tiếp URL chính:
`https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`

1. Bấm ĐỔI NHÂN SỰ thấy đúng danh sách `Đang làm việc`.
2. Đổi một nhân sự `Đang làm việc` -> `Đã nghỉ việc` trên Sheet; mở lại danh sách thì người đó biến mất.
3. Đổi lại `Đang làm việc`; người đó xuất hiện lại.
4. Camera mở bình thường.
5. Offline vẫn mở được sau khi đã tải Online.
6. Chụp/queue/đồng bộ không bị ảnh hưởng.

Chỉ sau khi người dùng xác nhận PASS mới cập nhật `LATEST_STABLE.md`.
