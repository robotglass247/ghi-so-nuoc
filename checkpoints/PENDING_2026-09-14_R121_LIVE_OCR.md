# PENDING – R12.1 LIVE OCR

**Ngày:** 2026-09-15

## Trạng thái
PENDING TEST – phiên bản DEV độc lập. Không thay R11.34 STABLE.

## Bản STABLE giữ nguyên
- Loader: `r9-direct.html`
- Module dự án STABLE: `water-project-tab-r91.js`
- Không sửa trực tiếp backend/deployment STABLE.
- Backup Drive: `APP_GHI_SO_NUOC_PASS_R11.34_2026-09-14`

## R12.1 DEV
- Loader: `r121-dev.html`
- Module dự án: `water-project-tab-r121.js`
- Module dữ liệu dự án DEV: `water-project-sheet-r121.js`
- Module tiến độ DEV: `water-progress-live-r121.js`
- Module Live OCR: `water-live-ocr-r121-v2.js`
- Build mục tiêu: `R12.1_DEV_ISOLATED_BACKEND_LIVE_OCR_V2`

## Backend R12.1 DEV đã triển khai riêng
- Web App DEV:
  `https://script.google.com/macros/s/AKfycbzsEfriZTOb76LVncaqMzAEMx5WZCiUW4WMTUooJatZIng4lowL3WlEO5GVO4r1DCk/exec`
- Google Sheet DEV: `DEV_R12.1_GHI_SO_NUOC_DATA_2026-09-14`
- Sheet ID: `1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM`
- Thư mục ảnh DEV: `ẢNH GHI SỐ NƯỚC - R12.1 DEV`

`r121-dev.html` hiện chèn URL backend DEV vào giao diện con sau khi tải lõi STABLE. Vì vậy upload ảnh, tải nhân sự và các request từ R12.1 dùng backend DEV mà không sửa `r9-direct.html` hoặc `v87-background.html` của STABLE.

## Chức năng Live OCR V2
1. Khi QR đã nhận ổn định, OCR chỉ đọc vùng dãy số trong khung vàng.
2. Hỗ trợ 2 dạng thử nghiệm: `5 số nguyên` và `4 số nguyên + 3 số lẻ`.
3. Chỉ số phải lặp ổn định trước khi coi là sẵn sàng; loại 5 số yêu cầu số lần xác nhận cao hơn.
4. Hiển thị trực tiếp chỉ số trên màn hình camera.
5. Có nút `SỬA` để người dùng chỉnh/xác nhận thủ công.
6. Trước khi lưu ảnh, nếu OCR chưa ổn định thì bắt buộc xác nhận/nhập chỉ số.
7. Record lưu local có thêm metadata Live OCR.
8. SPEED3 payload DEV gửi kèm metadata Live OCR.
9. Backend DEV lưu metadata OCR cùng Client ID/ảnh ở `HANG_DOI_ANH_V87` cột AB:AF.
10. Ảnh vẫn lưu local/offline trước như bản PASS.

## Module DEV tách riêng
Loader R12.1 đổi các module sau chỉ trong runtime DEV:
- `water-progress-live-r6.js` → `water-progress-live-r121.js`
- `water-project-tab-r91.js` → `water-project-tab-r121.js`
- `water-project-sheet-r93.js` → `water-project-sheet-r121.js`
- bổ sung `water-live-ocr-r121-v2.js`

## Tiêu chí test thực tế
- Camera mở bình thường.
- QR vẫn nhận nhanh như bản STABLE.
- Khung OCR không che QR.
- OCR đọc đúng đồng hồ thật trong điều kiện sáng/tối/phản sáng.
- Chỉ số hiển thị đúng định dạng.
- Sửa thủ công hoạt động.
- Chụp/lưu local không chậm đáng kể.
- Offline vẫn lưu Chờ.
- SPEED3 gửi ảnh thành công vào backend DEV.
- Metadata Live OCR vào đúng dòng ảnh theo Client ID.
- Ảnh nằm trong thư mục DEV.
- Không có dữ liệu test nào đi vào Sheet/ảnh STABLE.

## Không được làm
Không sửa trực tiếp `r9-direct.html`, `water-project-tab-r91.js`, camera/QR/SPEED3/backend đang phục vụ bản STABLE. Chỉ sau khi test thực tế PASS mới được chốt bản R12.1 STABLE mới.
