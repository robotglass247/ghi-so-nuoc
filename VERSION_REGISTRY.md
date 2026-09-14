# GHI SỐ NƯỚC – VERSION REGISTRY

## Quy tắc bắt buộc
1. Không sửa trực tiếp phiên bản STABLE/PASS đang chạy.
2. Trước mỗi đợt nâng cấp: sao lưu bản PASS gần nhất lên Google Drive.
3. Tạo loader/module mang tên phiên bản DEV mới.
4. Chỉ sửa file DEV.
5. Dữ liệu test DEV dùng Google Sheet riêng, không ghi vào Sheet STABLE.
6. Người dùng test thực tế và xác nhận PASS.
7. Sau PASS mới tạo STABLE mới; STABLE cũ vẫn giữ để rollback.

## R11.34 – STABLE / PASS
- Trạng thái: STABLE, không nâng cấp trực tiếp.
- Loader: `r9-direct.html`
- Module DỰ ÁN: `water-project-tab-r91.js`
- SHA module DỰ ÁN PASS: `7f84ea91fbfa5d92000e6f0c85bb2831cb6e0dff`
- Backup Drive: `APP_GHI_SO_NUOC_PASS_R11.34_2026-09-14`

## R12.1 – DEV / PENDING TEST
- Trạng thái: DEV độc lập để phát triển và thử nghiệm.
- Loader: `r121-dev.html`
- Module DỰ ÁN: `water-project-tab-r121.js`
- Module LIVE OCR: `water-live-ocr-r121.js`
- Build LIVE OCR: `879-r12.1-live-ocr-v1`
- OCR chạy tại trình duyệt, chỉ đọc vùng dãy số khi QR đã nhận ổn định.
- Quy tắc đồng hồ đang thử: 7 chữ số = 4 số m³ + 3 số thập phân.
- Chỉ số phải được OCR ổn định 2 lần hoặc người dùng nhập/xác nhận thủ công trước khi lưu ảnh.
- Khi lưu local, record IndexedDB có thêm: `liveReading`, `liveReadingRaw`, `liveReadingConfidence`, `liveReadingSource`, `liveReadingAt`.
- SPEED3 payload DEV gửi kèm các trường Live OCR trên; backend STABLE hiện tại có thể bỏ qua trường mới và không bị ảnh hưởng.

### Dữ liệu DEV riêng
- Google Sheet: `DEV_R12.1_GHI_SO_NUOC_DATA_2026-09-14`
- Sheet ID: `1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM`
- Đây là bản copy riêng phục vụ thử nghiệm R12.1; không dùng Sheet STABLE để test.

### Backend R12.1 DEV riêng
- File chuẩn để triển khai: `Ma_R12.1_DEV_LIVE_OCR_DEV_SHEET.txt`
- Backend đã trỏ `WATER_SHEET_ID` sang DEV Sheet ở trên.
- Tên thư mục ảnh khi khởi tạo: `ẢNH GHI SỐ NƯỚC - R12.1 DEV`.
- Bổ sung metadata Live OCR tại `HANG_DOI_ANH_V87` cột AB:AF.
- Đã kiểm tra cú pháp bằng `node --check`.
- Backend DEV CHƯA triển khai đè lên backend STABLE; cần deployment Apps Script riêng để có URL `/exec` DEV.
- Drive: `APP_GHI_SO_NUOC_R12.1_DEV_2026-09-14/`.
- Hướng dẫn triển khai: `01_DEPLOY_BACKEND_R12.1_DEV.txt`.

## Tiêu chí PASS cho R12.1 LIVE OCR
1. Camera mở và QR nhận như R11.34.
2. Khi QR hợp lệ, khung vàng OCR xuất hiện và chỉ số tự hiển thị trên camera.
3. 7 chữ số được ổn định 2 lần trước khi chuyển trạng thái sẵn sàng.
4. Có nút SỬA để xác nhận/nhập thủ công khi OCR chưa đúng.
5. Không cho lưu ảnh thiếu chỉ số xác nhận.
6. Ảnh vẫn lưu local/offline trước như R11.34.
7. SPEED3 vẫn đồng bộ ảnh bình thường.
8. Live OCR metadata lưu được cùng Client ID/ảnh trên backend DEV sau khi triển khai backend R12.1.
9. Toàn bộ dữ liệu test đi vào DEV Sheet/DEV ảnh, không vào STABLE.
10. R11.34 STABLE không thay đổi.

## Luồng phiên bản
`R11.34 STABLE -> COPY -> R12.1 DEV + DEV DATA -> TEST -> PASS -> R12.1 STABLE -> COPY -> R12.2 DEV`
