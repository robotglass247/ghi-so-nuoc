# STABLE CHECKPOINT – FAST6 SPEED1

**Ngày xác nhận:** 2026-09-11

**Trạng thái:** STABLE – người dùng đã test 10 ảnh ở cả Online/Offline, đồng bộ hoàn tất và `Chờ = 0`.

## Frontend giữ nguyên
- Trang chạy: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`
- Blob SHA `v87-background.html`: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`
- Service Worker: `water-offline-sw.js`
- Cache: `water-v878-offline-fast6`
- Upload backend AH: `AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8`

## Backend STABLE SPEED1
- File: `Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`
- SHA256: `fada3a63f9ac01ce48d461a5ec3e557beab385aa1db7a225d0d4f8f069c31790`
- Người dùng xác nhận: 10 ảnh Online/Offline -> đồng bộ hết -> `Chờ = 0`.
- Giữ chuẩn hóa mã legacy + token theo `DANH_MUC_DONG_HO`.
- Backend SPEED1 giảm đọc danh mục lặp, bỏ flush cưỡng bức trong đường ACK, AI nền nhường burst upload.

## Backup Drive
- Folder: `GHI_SO_NUOC_BACKUP`
- Folder ID: `18qRrwEdUraySQGrv2RD9zfp-Z1V_ykek`
- File backup nguyên bản: `STABLE_2026-09-11_Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`
- Drive File ID: `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`

## Chức năng đã PASS thực tế
- Online mở/chụp/lưu.
- Offline mở/chụp/lưu.
- Online đồng bộ.
- Hàng Chờ về 0.
- Backend nhận dữ liệu thật.
- Token/mã legacy nhiều thế hệ hoạt động theo danh mục.

## Vùng khóa
Không sửa trực tiếp mốc Stable khi phát triển SPEED2/UI. Không ghi đè hoặc thay đổi trực tiếp các hàm lõi camera/QR/lưu IndexedDB/Offline/Service Worker của FAST6 Stable.

## Quy tắc phát triển tiếp
- SPEED2 phải là bản thử riêng.
- SPEED2 Batch không được thay thế API upload đơn hiện tại; API đơn giữ làm fallback.
- Nếu SPEED2 lỗi, đóng bản test và quay ngay FAST6 SPEED1.
- Chỉ nâng SPEED2 thành Stable sau khi người dùng test hàng lớn, đủ bản ghi server và `Chờ = 0`.
