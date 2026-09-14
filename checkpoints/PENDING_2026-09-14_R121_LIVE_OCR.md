# PENDING – R12.1 LIVE OCR

**Ngày:** 2026-09-14

## Trạng thái
PENDING TEST – phiên bản DEV độc lập. Không thay R11.34 STABLE.

## Bản STABLE giữ nguyên
- Loader: `r9-direct.html`
- Module dự án: `water-project-tab-r91.js`
- SHA module dự án PASS: `7f84ea91fbfa5d92000e6f0c85bb2831cb6e0dff`
- Backup Drive: `APP_GHI_SO_NUOC_PASS_R11.34_2026-09-14`

## R12.1 DEV
- Loader: `r121-dev.html`
- Module dự án: `water-project-tab-r121.js`
- Module Live OCR: `water-live-ocr-r121.js`
- Build OCR: `879-r12.1-live-ocr-v1`

## Chức năng Live OCR đã triển khai ở DEV
1. Khi QR đã nhận ổn định, OCR chỉ đọc vùng dãy số trong khung vàng.
2. Quy tắc thử nghiệm hiện tại: 7 chữ số = 4 số m³ + 3 số thập phân.
3. Chỉ số phải lặp ổn định 2 lần trước khi coi là sẵn sàng.
4. Hiển thị trực tiếp chỉ số trên màn hình camera.
5. Có nút `SỬA` để người dùng chỉnh/xác nhận thủ công.
6. Trước khi lưu ảnh, nếu OCR chưa ổn định thì bắt buộc xác nhận/nhập chỉ số.
7. Record lưu local có thêm metadata Live OCR.
8. SPEED3 payload DEV gửi kèm metadata Live OCR.
9. Ảnh vẫn lưu local/offline trước như R11.34.

## Backend R12.1 DEV
Đã tạo bản backend riêng và kiểm tra cú pháp, lưu tại Google Drive:
`APP_GHI_SO_NUOC_R12.1_DEV_2026-09-14/Ma_R12.1_DEV_LIVE_OCR.txt`

Bản backend DEV bổ sung cột AB:AF của `HANG_DOI_ANH_V87` để lưu:
- Live OCR chỉ số
- Live OCR raw
- Live OCR tin cậy
- Live OCR nguồn
- Live OCR thời gian

Backend DEV CHƯA triển khai đè lên Apps Script STABLE. Vì vậy R11.34 không bị ảnh hưởng.

## Tiêu chí test thực tế
- Camera mở bình thường.
- QR vẫn nhận nhanh như R11.34.
- Khung OCR không che QR.
- OCR đọc đúng đồng hồ thật trong điều kiện sáng/tối/phản sáng.
- Chỉ số hiển thị đúng định dạng.
- Sửa thủ công hoạt động.
- Chụp/lưu local không chậm đáng kể.
- Offline vẫn lưu Chờ.
- SPEED3 vẫn gửi ảnh thành công.
- Sau khi triển khai backend DEV riêng: metadata Live OCR vào đúng dòng ảnh theo Client ID.

## Không được làm
Không sửa trực tiếp `r9-direct.html`, `water-project-tab-r91.js`, camera/QR/SPEED3/backend đang phục vụ R11.34 STABLE.
