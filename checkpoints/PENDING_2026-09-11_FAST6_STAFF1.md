# PENDING CHECKPOINT – FAST6 STAFF1

**Ngày tạo:** 2026-09-11  
**Cập nhật:** 2026-09-12

**Trạng thái:** PENDING TEST – không thay thế SPEED3 Stable.

## Stable nền
- Latest Stable: `STABLE-2026-09-11-FAST6-SPEED3-TURBO`.
- Backend SPEED3 giữ nguyên, không sửa.
- `v87-background.html` blob SHA: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`.
- `water-offline-sw.js` blob SHA: `349594da93e543d129b8950102d76546d5c1ad68`.

## Hiện trạng lỗi
- Sheet `NHAN_SU_THUC_HIEN` có 8 nhân sự đang làm việc: NS001 → NS008.
- FAST6 thực tế đang hiển thị 4 người.
- Con số 4 khớp fallback của Service Worker FAST6, cho thấy nguồn động chưa cập nhật vào app.

## Kiểm tra code backend SPEED3
Đã đọc trực tiếp file backend SPEED3 Stable:
- chỉ có 1 `doGet(e)`;
- có nhánh `api === 'staff'`;
- có nhánh `api === 'staffframe'`;
- có hàm `layDanhSachNhanSuWeb_()` đọc sheet `NHAN_SU_THUC_HIEN`, cột A:F, lọc trạng thái chứa `đang`;
- với dữ liệu hiện tại logic phải trả đủ NS001 → NS008.

## Test GET đã FAIL
Trang:
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-test.html`
- Commit: `d71a7c167adce7f552807eea247d772a933e5a52`

Kết quả người dùng xác nhận 2026-09-11:
- `TIMEOUT · BACKEND CHƯA TRẢ DANH SÁCH`;
- không nhận được danh sách qua JSONP/GET iframe trong cửa sổ 8 giây.

## Phát hiện ngày 2026-09-12 – kênh đúng là POST
Trong chính backend SPEED3 Stable có sẵn kênh dữ liệu động qua POST:
- `doPost()` nhận `api=uistate`;
- gọi `waterUiStatePost_(p)`;
- `waterUiStatePost_()` gọi `layDanhSachNhanSuWeb_(ss)`;
- phản hồi `WATER_UI_STATE` bằng `postMessage` với trường `staff`;
- comment trong backend ghi rõ kênh này dùng cho nhân sự + tiến độ qua POST iframe ổn định, không dùng JSONP / GET iframe.

Do đó hướng đúng của STAFF1 là dùng POST `api=uistate`, không tiếp tục tăng timeout cho GET cũ.

## Trang test STAFF1-POST
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-post-test.html`
- Commit tạo trang: `14844696d4eb1272a6455c55fe26cc48fed4e78a`
- Gửi form POST ẩn vào backend AH/SPEED3.
- `api=uistate`.
- Có `requestId` riêng và chỉ nhận phản hồi `WATER_UI_STATE` đúng requestId.
- Không dùng cache/fallback.
- Chờ tối đa 20 giây.
- Chỉ PASS khi phản hồi backend chứa đủ NS001 → NS008.

## Điều kiện bước tiếp theo
1. Người dùng test `staff1-post-test.html`.
2. Nếu PASS đủ 8 người: tạo frontend STAFF1 PENDING riêng dùng POST `uistate`, giữ nguyên toàn bộ SPEED3/camera/QR/IndexedDB/Offline.
3. Test trên app thật: ĐỔI NHÂN SỰ hiển thị đủ 8; chọn/lưu nhân sự PASS; Offline dùng cache; Online cập nhật mới nhất.
4. Chỉ sau xác nhận người dùng mới nâng STAFF1 thành Stable.

## Rollback
Chưa có thay đổi nào vào FAST6 Stable. SPEED3 Stable giữ nguyên hoàn toàn.
