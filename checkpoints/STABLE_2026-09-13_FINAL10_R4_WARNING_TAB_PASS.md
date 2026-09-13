# STABLE 2026-09-13 – FINAL10 R4 WARNING TAB PASS

## Trạng thái
**PASS – LOCKED RIÊNG MODULE CẢNH BÁO QR VỪA XỬ LÝ LIỀN KỀ**

## Xác nhận trực tiếp của người dùng
Ngày 2026-09-13, người dùng xác nhận: **“OK. Tab này Pass. Em đóng ở đây”**.

Phạm vi PASS được chốt đúng theo phần người dùng vừa test:
- Khi QR hiện tại là đúng đồng hồ vừa xử lý liền trước và hệ thống đang khóa nút chụp, hiển thị cảnh báo rõ: **HÃY CHỌN ĐỒNG HỒ KHÁC ĐỂ CHỤP**.
- Dòng phụ: **Đồng hồ này vừa chụp xong.**
- Tab/nút cảnh báo có nền nổi bật màu vàng cam, viền cam đậm, chữ nâu đỏ đậm để dễ nhận biết.
- Trạng thái cảnh báo không còn bị mờ dù nút chụp đang disabled.
- Khi chuyển sang mã đồng hồ khác, cảnh báo được bỏ và luồng chụp tiếp tục bình thường.

Không suy rộng PASS này sang các phần chưa được người dùng xác nhận riêng trong lượt này.

## Link test đã dùng
`https://robotglass247.github.io/ghi-so-nuoc/update-final10-postcapture-r4.html`

## Build
`879-final10-postcapture-r4`

## GitHub Pages
Run: `34739520084`

Kết quả: **completed / success**

Head commit: `ad61f9b71a96c4616212b65be5fbc47a1f53f3ee`

## File chuẩn của module PASS

### `water-shot-guide-final10-postcapture-r4.js`
- commit: `09eac01f34f5cba7f8a44543dd69fb09d2fb3648`
- blob: `9b2bea94f2e1e4f649f73aa451a4789bb3b0aa33`
- chức năng: giao diện/logic cảnh báo liền kề + màu cảnh báo R4

### `water-offline-sw-final10-postcapture-r4.js`
- commit: `5dedefa63d36dea3d737afcb12b0bd677565c001`
- blob: `681c4aa89f816226be053449f4958140a3bb677b`
- build: `879-final10-postcapture-r4`

### `update-final10-postcapture-r4.html`
- commit: `ad61f9b71a96c4616212b65be5fbc47a1f53f3ee`
- blob: `6567d7e040badf9972b9974fa801c622dd75e2bc`

## Module lõi được giữ nguyên khi tạo R4
Các phần dưới đây không được sửa bởi thay đổi màu tab/cảnh báo này:
- `water-final-core-pre.js` – blob `0ca1c810cdf3062af21cd26a805785ce7a4ac771`
- `water-ui3.js` MAIN905 – blob `0ccf58b9ff1be0ec5faf06a3a201285d9cbac607`
- `water-final-core-post.js` – blob `e4f5ea0a08e3b8935dad074fb38efec89d3d04cd`
- `water-camera-fast-final6.js` – blob `ed1076631da238a4824556b57415f122100f4921`
- `captureAndSave`, IndexedDB `water_meter_v6`, queue/Chờ, Offline/local-first, SPEED3 sync không sửa trong module này.

## Quy tắc khóa
Khi cần sửa tiếp phần cảnh báo QR vừa xử lý liền kề:
1. Bắt đầu từ đúng `water-shot-guide-final10-postcapture-r4.js` blob `9b2bea94f2e1e4f649f73aa451a4789bb3b0aa33`.
2. Không dựng lại từ trí nhớ, không lấy FINAL8/FINAL9/R2/R3 thay thế.
3. Không sửa lõi chụp/lưu/đồng bộ nếu yêu cầu chỉ là màu/chữ/tab cảnh báo.
4. Nếu bản mới lỗi, phục hồi module cảnh báo từ mốc PASS này.

## Ghi chú
Mốc phục hồi toàn bộ app trước đó **FINAL2 SAFE PASS** vẫn giữ nguyên vai trò mốc phục hồi lõi tổng thể. Checkpoint này là mốc PASS mới cho **module cảnh báo QR vừa xử lý liền kề / tab cảnh báo R4**.
