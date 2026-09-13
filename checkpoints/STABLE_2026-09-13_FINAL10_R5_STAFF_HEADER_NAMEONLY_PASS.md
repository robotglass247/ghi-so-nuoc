# STABLE – FINAL10 R5 STAFF HEADER NAME-ONLY PASS

**Ngày xác nhận:** 2026-09-13

## Trạng thái
**PASS – LOCKED RIÊNG PHẦN HIỂN THỊ NHÂN SỰ Ở DÒNG ĐẦU**

## Xác nhận trực tiếp của người dùng
Người dùng xác nhận: **“OK, Pass hiển thị nhân sự ở đây”**.

## Phạm vi PASS
- Dòng đầu của ứng dụng chỉ hiển thị **Họ và tên nhân sự**.
- Không hiển thị mã nhân sự dạng `NSxxx - Họ tên` ở dòng đầu.
- Mã nhân sự vẫn được giữ nội bộ để các luồng lưu/backend hoạt động như cũ.
- Bản này kế thừa FINAL10 R4 đã PASS cho tab cảnh báo QR vừa xử lý.

## Link updater PASS
`https://robotglass247.github.io/ghi-so-nuoc/update-final10-postcapture-r5-nameonly.html`

## Build
`879-final10-postcapture-r5-nameonly`

## File chuẩn
### 1. Module name-only
`water-staff-header-nameonly-r5.js`
- commit tạo file: `f431d2ba6c758d5dd7c9a6372e7665fc699c9757`
- blob: `a7534a86fc365efab22187703d9ce65f51728106`

### 2. Service worker wrapper
`water-offline-sw-final10-postcapture-r5-nameonly.js`
- commit tạo file: `174b9c65131e1d67300f8996998db882c9fe5f44`
- blob: `b4ae80d34853319d5b59776439a9c10c647b947c`

### 3. Updater
`update-final10-postcapture-r5-nameonly.html`
- commit tạo file: `9fbcc1e39492199e46e849ae70838ddaf958dc95`
- blob: `0037bbd5da134c20283cc1e1811a2d861e50a69f`

## GitHub Pages
Run `34740868184`: **completed / success**.

## Mốc kế thừa
- Tab cảnh báo QR liền kề: FINAL10 R4 PASS.
- Nhân sự MAIN905: PASS.
- Lõi Chụp/Lưu/Chờ/Đồng bộ: FINAL2 SAFE / SPEED3 PASS.

## CẤM SỬA KHI LÀM MODULE KHÁC
Không sửa module name-only này, MAIN905, tab cảnh báo R4, camera/QR, `captureAndSave`, IndexedDB `water_meter_v6`, queue/Chờ, Offline/local-first hoặc SPEED3 trừ khi người dùng yêu cầu sửa đúng phần đó.
