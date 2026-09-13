# STABLE 2026-09-13 – FINAL10 R6 LIVE PROGRESS PASS

## Trạng thái
PASS – LOCKED RIÊNG MODULE CẬP NHẬT TIẾN ĐỘ

## Xác nhận trực tiếp của người dùng
Ngày 2026-09-13 người dùng xác nhận: “cập nhật thay đổi OK phần này PASS ở đây, Em lưu lại”.

## Phạm vi PASS
- Hàng tiến độ Tổng / Đã chụp / Chưa chụp đã lên đúng theo backend PASS.
- Khi có thay đổi sau đồng bộ, app cập nhật lại tiến độ gần như ngay; có nhịp kiểm tra nền khoảng 4 giây/lần khi app đang hiển thị và có mạng.
- Cơ chế trigger sau SPEED3 gửi hết và sau Chờ về 0 hoạt động đúng theo yêu cầu đã test.

## Link updater PASS
https://robotglass247.github.io/ghi-so-nuoc/update-final10-postcapture-r6-liveprogress.html

## Build
879-final10-postcapture-r6-liveprogress

## File/commit/blob chuẩn
- water-progress-live-r6.js
  - commit: 7e91f8440505fd099023c65f1b42fcadc11ab9e7
  - blob: 00671c6924b565de99078e18341c7a783e9ca976
- water-offline-sw-final10-postcapture-r6-liveprogress.js
  - commit: b7cd0f1a528651845ce16e1832a124f0593a4201
  - blob: cb6c3a4b3621a4658cfbf2dc34966423364857b0
- update-final10-postcapture-r6-liveprogress.html
  - commit: cb75fa25412dab82595bf4d5d5fc941e02e99932
  - blob: 57a0e08e0a0a97658635549ba84d5755ce82f86d

## Backend tiến độ đang dùng
Mốc backend 84 / 54 / 30 đã được người dùng xác nhận lên app OK trước khi test R6. Không sửa backend khi chỉnh giao diện R6/R7 nếu không có yêu cầu riêng.

## Phần giữ nguyên / không được sửa khi làm module khác
Không sửa camera, QR, captureAndSave, IndexedDB water_meter_v6, queue/Chờ, Offline/local-first, SPEED3, Nhân sự MAIN905/R5 name-only, tab cảnh báo R4 hoặc logic tiến độ R6 khi chỉnh riêng giao diện.

## Quy tắc phục hồi
Nếu cần phục hồi riêng phần cập nhật tiến độ realtime, dùng đúng 3 file/blob ở trên. Không dựng lại từ trí nhớ và không lấy candidate gần tên.
