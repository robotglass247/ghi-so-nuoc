# PENDING CHECKPOINT – FAST6 STAFF1

**Ngày tạo:** 2026-09-11  
**Cập nhật:** 2026-09-12

**Trạng thái:** PENDING APP TEST – không thay thế SPEED3 Stable.

## Stable nền
- Latest Stable: `STABLE-2026-09-11-FAST6-SPEED3-TURBO`.
- Backend SPEED3 giữ nguyên, không sửa.
- `v87-background.html` blob SHA: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`.
- `water-offline-sw.js` blob SHA: `349594da93e543d129b8950102d76546d5c1ad68`.

## Hiện trạng ban đầu
- Sheet `NHAN_SU_THUC_HIEN` có 8 nhân sự đang làm việc: NS001 → NS008.
- FAST6 Stable thực tế hiển thị 4 người.
- Con số 4 khớp fallback Service Worker, cho thấy nguồn động cũ không cập nhật vào app.

## Test GET đã FAIL
Trang:
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-test.html`
- Commit: `d71a7c167adce7f552807eea247d772a933e5a52`

Kết quả người dùng xác nhận 2026-09-11:
- `TIMEOUT · BACKEND CHƯA TRẢ DANH SÁCH`;
- JSONP/GET iframe không trả trong cửa sổ test 8 giây.

## Kênh đúng: POST uistate
Backend SPEED3 Stable đã có sẵn:
- `doPost()` nhận `api=uistate`;
- gọi `waterUiStatePost_(p)`;
- lấy `staff` bằng `layDanhSachNhanSuWeb_(ss)`;
- phản hồi `WATER_UI_STATE` qua `postMessage`.

## STAFF1-POST test – PASS
Trang:
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-post-test.html`
- Commit tạo trang: `14844696d4eb1272a6455c55fe26cc48fed4e78a`

Kết quả người dùng xác nhận 2026-09-12:
- đã lên đủ 8 nhân sự;
- NS001 → NS008 được trả từ POST `uistate`;
- xác nhận backend/dữ liệu nhân sự động hoạt động đúng trên kênh POST.

## App candidate STAFF1 PENDING
Trang ứng viên:
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-app-test.html`

Cách làm:
- không sửa `v87-background.html` Stable;
- launcher lấy đúng HTML Stable hiện tại rồi chỉ patch lớp tải nhân sự khi chạy;
- đổi tải nhân sự từ GET/JSONP sang POST `api=uistate`;
- cache riêng: `water_staff_list_staff1_pending`;
- fallback test giữ 4 người để dễ phân biệt: nếu Online lên 8 thì đó là POST thật;
- không sửa camera, QR, IndexedDB, capture, syncQueue, BACKEND_URL, SPEED3 hay Service Worker Stable.

Commit ban đầu candidate:
- `8df5ed3eda2fb5c99d01759a80e673355f25ae82`

Phát hiện lỗi cú pháp trong candidate trước khi test, chưa ảnh hưởng Stable.
Đã sửa và harden candidate:
- commit `f330ebdf444acb15e8cd53d13fe057869628985c`;
- blob `ec0d495b44ccea58bf951abb08288ea089b34a36`.

## Điều kiện PASS app candidate
1. Mở `staff1-app-test.html` khi Online.
2. Bấm **ĐỔI NHÂN SỰ** và thấy đủ NS001 → NS008.
3. Chọn một nhân sự và bấm **LƯU NHÂN SỰ**; tên/mã hiển thị đúng trên thanh trên cùng.
4. Mở lại **ĐỔI NHÂN SỰ** vẫn đủ 8.
5. Không phát sinh lỗi camera/QR/chụp/Chờ trong kiểm tra nhanh.
6. Chỉ sau xác nhận người dùng mới tạo phương án nâng STAFF1 Stable.

## Rollback
Không có thay đổi nào vào FAST6/SPEED3 Stable. Nếu candidate lỗi, đóng `staff1-app-test.html`; dùng lại `v87-background.html` Stable ngay.
