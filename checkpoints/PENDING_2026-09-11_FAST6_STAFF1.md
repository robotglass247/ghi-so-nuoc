# PENDING CHECKPOINT – FAST6 STAFF1

**Ngày tạo:** 2026-09-11

**Trạng thái:** PENDING DIAGNOSIS – test thực tế FAIL do timeout backend, không thay thế SPEED3 Stable.

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
- chỉ có 1 nhánh `api === 'staff'`;
- chỉ có 1 nhánh `api === 'staffframe'`;
- chỉ có 1 hàm `layDanhSachNhanSuWeb_()`;
- hàm đọc sheet `NHAN_SU_THUC_HIEN`, cột A:F, và lọc các dòng có trạng thái chứa `đang`.

Với dữ liệu Sheet hiện tại, logic này phải trả đủ NS001 → NS008. Chưa phát hiện lỗi logic trong code API nhân sự.

## Trang test riêng
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-test.html`
- Commit tạo trang: `d71a7c167adce7f552807eea247d772a933e5a52`
- Test gọi trực tiếp AH/SPEED3 bằng JSONP + iframe.
- Không dùng fallback để báo PASS.

## Kết quả test thực tế 2026-09-11
Người dùng xác nhận trang STAFF1 báo:
- `TIMEOUT · BACKEND CHƯA TRẢ DANH SÁCH`;
- không nhận được danh sách từ cả đường JSONP/iframe trong cửa sổ test 8 giây.

Do đó:
- lỗi không nằm ở dữ liệu Sheet;
- chưa thấy lỗi trong logic `layDanhSachNhanSuWeb_()`;
- phạm vi còn lại cần kiểm tra là GET của deployment live / thời gian phản hồi thực tế / phiên bản deployment đang phục vụ.

## Ghi chú timeout hiện tại
- FAST6 Service Worker chỉ chờ khoảng 3 giây trước khi rơi về fallback.
- STAFF1 test chờ 8 giây vẫn timeout.
- Chưa được phép kết luận chỉ cần tăng timeout; phải kiểm tra live deployment GET trước.

## Việc tiếp theo – DỪNG TẠI ĐÂY TỐI 2026-09-11
Ngày mai tiếp tục theo thứ tự:
1. Kiểm tra trực tiếp live deployment GET `?api=staff` và thời gian phản hồi.
2. Xác nhận deployment live có đúng version chứa API staff của SPEED3 Stable hay không.
3. Sau khi có bằng chứng mới quyết định STAFF1 patch: deployment / timeout / frontend.

## Điều kiện nâng Stable
1. API live trả danh sách động đủ NS001 → NS008.
2. Sau đó mới tạo patch frontend FAST6 PENDING riêng.
3. Test trên app thật: ĐỔI NHÂN SỰ hiển thị đủ 8, chọn/lưu nhân sự PASS, Online/Offline không ảnh hưởng.
4. Chỉ sau xác nhận của người dùng mới nâng thành Stable.

## Rollback
Không có thay đổi nào vào Stable ở giai đoạn chẩn đoán này. SPEED3 Stable giữ nguyên hoàn toàn.
