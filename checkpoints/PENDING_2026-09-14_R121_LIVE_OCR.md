# PENDING – R12.1 POST-CAPTURE READING

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
- Module đọc sau chụp: `water-postcapture-reading-r121-v1.js`
- Build mục tiêu: `R12.1_DEV_POST_CAPTURE_READING_V1`

## Backend R12.1 DEV
- Web App DEV:
  `https://script.google.com/macros/s/AKfycbzsEfriZTOb76LVncaqMzAEMx5WZCiUW4WMTUooJatZIng4lowL3WlEO5GVO4r1DCk/exec`
- Google Sheet DEV: `DEV_R12.1_GHI_SO_NUOC_DATA_2026-09-14`
- Sheet ID: `1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM`
- Thư mục ảnh DEV: `ẢNH GHI SỐ NƯỚC - R12.1 DEV`

## Phương án mới đã triển khai
1. Giữ nguyên thao tác chụp như bản cũ: đưa đồng hồ + QR vào khung, QR OK thì bấm CHỤP.
2. Bỏ hoàn toàn khung vàng và OCR trực tiếp trên camera.
3. Ảnh được lưu local trước như bản PASS; không chờ OCR mới được lưu.
4. OCR nội bộ đọc trên chính ảnh vừa chụp ở tác vụ nền.
5. Hiển thị ngay dưới màn hình:
   - Chỉ số mới
   - Chỉ số cũ
   - Số mét khối = Chỉ số mới - Chỉ số cũ
6. Chỉ số cũ được tải từ `CHI_SO_DAU` khi có mạng và lưu cache trên thiết bị để dùng khi mất mạng.
7. Có nút `SỬA` để chỉnh lại chỉ số mới của ảnh vừa chụp.
8. Nếu chỉ số mới < chỉ số cũ, giao diện cảnh báo cần kiểm tra.
9. SPEED3 chờ OCR nền một khoảng ngắn trước khi đóng gói payload; người dùng vẫn có thể tiếp tục chụp đồng hồ tiếp theo.
10. Metadata vẫn dùng các trường `liveReading*` để tương thích backend DEV hiện tại.

## Khả năng OFFLINE
- Nếu app đã được mở khi có mạng và OCR nội bộ đã báo sẵn sàng, sau đó mất mạng thì OCR vẫn đọc ảnh mới trong cùng phiên vì worker/model đã nằm trên thiết bị/bộ nhớ phiên.
- Chỉ số cũ đã cache cũng dùng được khi offline, nên vẫn tính được số mét khối.
- Nếu mở app lần đầu tiên khi hoàn toàn không có mạng và OCR runtime/model chưa từng được tải, không cam kết OCR đọc được; ảnh vẫn được lưu an toàn và sẽ xử lý khi có mạng.
- Bước tiếp theo sau test chức năng là nâng PWA cache để hỗ trợ mở lại từ trạng thái lạnh khi offline đáng tin cậy hơn.

## Tiêu chí test thực tế
- Camera và QR hoạt động như bản STABLE.
- Không còn khung vàng OCR.
- Bấm CHỤP lưu ảnh nhanh như bản cũ.
- Sau khi chụp hiện `Chỉ số mới / Chỉ số cũ / Số mét khối`.
- Chụp liên tiếp không phải chờ OCR.
- Mất mạng sau khi OCR đã sẵn sàng: vẫn đọc được ảnh mới và tính tiêu thụ bằng cache.
- SPEED3 gửi ảnh thành công vào backend DEV.
- Không có dữ liệu test nào đi vào Sheet/ảnh STABLE.

## Không được làm
Không sửa trực tiếp `r9-direct.html`, `water-project-tab-r91.js`, camera/QR/SPEED3/backend đang phục vụ bản STABLE. Chỉ sau khi test thực tế PASS mới được chốt R12.1 STABLE mới.
