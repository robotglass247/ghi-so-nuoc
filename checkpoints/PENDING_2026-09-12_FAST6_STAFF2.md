# PENDING CHECKPOINT – FAST6 STAFF2

**Ngày:** 2026-09-12
**Trạng thái:** PENDING TEST – không thay thế SPEED3 Stable / STAFF1 chưa nâng Stable.

## Mục tiêu
1. Sheet `NHAN_SU_THUC_HIEN`, cột F `TÌNH TRẠNG` chỉ chọn:
   - `Đang làm việc`
   - `Đã nghỉ việc`
2. App chỉ hiển thị nhân sự có trạng thái chính xác `Đang làm việc`.
3. Nếu nhân sự đang được chọn trên máy sau đó không còn trong danh sách đang làm việc, App yêu cầu chọn lại người khác.

## Backup trước khi sửa Sheet
- File: `BACKUP_2026-09-12_NHAN_SU_THUC_HIEN_STAFF2`
- Spreadsheet ID: `1EQ12X-mtp7PPq6SAF4L4-c_8jXrqabbvvJuCizQQRyg`

## Sheet đã cập nhật
- Spreadsheet chính: `1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY`
- Sheet: `NHAN_SU_THUC_HIEN`
- Cột F, phạm vi F2:F1000 đã đặt Data Validation ONE_OF_LIST:
  - `Đang làm việc`
  - `Đã nghỉ việc`
- strict=true, showCustomUi=true.

## Hiện trạng dữ liệu lúc tạo STAFF2
- NS007 = `Đã nghỉ việc`.
- NS008 = trống tình trạng.
- NS009 = `Đang làm việc`.
- Theo quy tắc STAFF2: NS007 và NS008 không lên App; NS009 lên App.

## Backend STAFF2 PENDING
Nguồn: SPEED3 Stable backup.

File:
`PENDING_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF2_FULL.txt`

SHA256:
`ee7ad42d06b2e409b8c0a1f80ee9338970cae11b7773779dbd2327f52ad319ef`

Drive ID:
`1lBCNsoQUfDqznSl45ogDy0JsOzITTmrM`

Thay đổi duy nhất về logic nhân sự hiển thị:
- trước: ô trạng thái trống vẫn có thể lọt qua;
- STAFF2: chỉ `trangThai === 'đang làm việc'` mới đưa vào `layDanhSachNhanSuWeb_()`.

Không sửa `waterStaffMapFast6_()` hoặc `timNhanSuTheoMa_()` để tránh làm kẹt ảnh Offline cũ của nhân sự vừa nghỉ việc.

Kiểm tra cú pháp backend bằng Node parser: PASS.

## Frontend STAFF2 PENDING
Trang:
`https://robotglass247.github.io/ghi-so-nuoc/staff2-app-test.html`

Commit tạo candidate:
`029f5393b8a9aefe7fe77c28af21b5bde4a4f133`

Nguyên tắc:
- lấy nguyên `v87-background.html` Stable lúc chạy;
- chỉ patch lớp nhân sự sang POST `api=uistate`;
- dùng cache riêng `water_staff_list_staff2_pending`;
- nếu mã đang chọn không còn trong danh sách POST, xóa `water_staff` và yêu cầu chọn lại;
- không sửa camera, QR, IndexedDB, Offline, upload hoặc SPEED3 Turbo.

## Trình tự test
1. Deploy backend STAFF2 thành New version trên cùng deployment AH.
2. Mở `staff2-app-test.html`.
3. Bấm `ĐỔI NHÂN SỰ`.
4. Xác nhận:
   - chỉ người `Đang làm việc` xuất hiện;
   - NS007 (`Đã nghỉ việc`) không xuất hiện;
   - NS008 (trống) không xuất hiện;
   - NS009 (`Đang làm việc`) xuất hiện.
5. Đổi một nhân sự từ `Đang làm việc` sang `Đã nghỉ việc`, mở lại danh sách và xác nhận người đó biến mất.
6. Đổi lại `Đang làm việc`, mở lại danh sách và xác nhận người đó xuất hiện lại.
7. Camera/QR/Online/Offline không regress.

## Điều kiện nâng Stable
Chỉ nâng sau khi người dùng xác nhận test PASS trên app thật.

## Rollback
- Backend rollback gần nhất: SPEED3 Stable Drive ID `1DXzq6GoO4BCyoav_y9WF-OTGJlPd0Ykn`.
- `v87-background.html` Stable không bị sửa trong giai đoạn STAFF2 PENDING.
