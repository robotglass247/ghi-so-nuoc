# PENDING – PROJECT R12.1 MODULE

**Ngày triển khai:** 2026-09-14

## Trạng thái
PENDING TEST – đã tích hợp vào app hiện tại, chưa nâng thành STABLE cho tới khi người dùng test thực tế.

## Phạm vi thay đổi
Chỉ thay nội dung module `water-project-tab-r91.js` đang được `r9-direct.html` nạp sẵn. Không thay chuỗi lõi CHỤP SỐ, camera, QR, IndexedDB, Offline, SPEED3, backend hay module QUẢN LÝ.

## Nội dung DỰ ÁN R12.1
- Thông tin dự án: tên, mã dự án, trạng thái, địa chỉ, đơn vị quản lý vận hành, người phụ trách.
- Ảnh dự án từ nguồn hiện có.
- Lịch ghi số: ngày bắt đầu, ngày kết thúc, hạn ghi.
- Tổng quan kỳ ghi: kỳ ghi, tổng, đã chụp, chưa chụp và % tiến độ.
- Ghi chú dự án nếu có.
- Dữ liệu tiếp tục nhận qua `WATER_UI_STATE` và cache hiện hữu; không tạo backend mới.

## Commit
`b7458a048aa25e6a5c7dba60f47d0c214e57de37`

## Rollback
Blob trước thay đổi của `water-project-tab-r91.js`: `7f84ea91fbfa5d92000e6f0c85bb2831cb6e0dff`.

## Tiêu chí PASS
1. Tab DỰ ÁN mở đúng và không tràn màn hình điện thoại.
2. Hiển thị đúng thông tin dự án/lịch/tiến độ.
3. Tab CHỤP SỐ vẫn mở camera, nhận QR và chụp như mốc PASS.
4. Tab QUẢN LÝ không thay đổi.
5. Offline/chờ đồng bộ không bị ảnh hưởng.
