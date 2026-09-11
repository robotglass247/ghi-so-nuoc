# PENDING CHECKPOINT – FAST6 STAFF1

**Ngày tạo:** 2026-09-11

**Trạng thái:** PENDING TEST – không thay thế SPEED3 Stable.

## Stable nền
- Latest Stable: `STABLE-2026-09-11-FAST6-SPEED3-TURBO`.
- Backend SPEED3 giữ nguyên, không sửa.
- `v87-background.html` blob SHA: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`.
- `water-offline-sw.js` blob SHA: `349594da93e543d129b8950102d76546d5c1ad68`.

## Hiện trạng lỗi
- Sheet `NHAN_SU_THUC_HIEN` có 8 nhân sự đang làm việc: NS001 → NS008.
- FAST6 thực tế đang hiển thị 4 người.
- Con số 4 khớp fallback của Service Worker FAST6, cho thấy nguồn động NE chưa cập nhật vào app.

## Kiểm tra backend SPEED3
Backend SPEED3 Stable đã có `api=staff` và `layDanhSachNhanSuWeb_()` đọc toàn bộ sheet `NHAN_SU_THUC_HIEN`, 6 cột, lọc trạng thái đang làm việc. Không sửa backend.

## Hướng STAFF1
- Dùng chính backend AH/SPEED3 Stable làm nguồn nhân sự động.
- Loại bỏ phụ thuộc deployment NE cũ cho nhân sự.
- Không thay đổi upload, SPEED3 Turbo, camera, QR, IndexedDB, Offline hay đồng bộ.

## Trang test riêng
- `https://robotglass247.github.io/ghi-so-nuoc/staff1-test.html`
- Commit tạo trang: `d71a7c167adce7f552807eea247d772a933e5a52`
- Test gọi trực tiếp AH/SPEED3 bằng JSONP + iframe.
- Không dùng fallback để báo PASS.
- Chỉ PASS khi nhận đủ NS001 → NS008 từ backend.

## Điều kiện nâng Stable
1. Trang STAFF1 báo `PASS · BACKEND TRẢ ĐỦ 8 NHÂN SỰ`.
2. Sau đó tạo patch frontend FAST6 PENDING riêng: đổi nguồn STAFF sang AH/SPEED3, tăng cache version, fallback đủ 8.
3. Test trên app thật: ĐỔI NHÂN SỰ hiển thị đủ 8, chọn/lưu nhân sự PASS, Online/Offline không ảnh hưởng.
4. Chỉ sau xác nhận của người dùng mới nâng thành Stable.

## Rollback
Không có thay đổi nào vào Stable ở giai đoạn test này. Nếu STAFF1 test lỗi, bỏ candidate; SPEED3 Stable giữ nguyên.
