# STABLE 2026-09-13 – FINAL2 SAFE PASS

## Trạng thái
**PASS – LOCKED**

## Xác nhận trực tiếp từ người dùng
Ngày 2026-09-13, sau khi test bản `FINAL2 SAFE`, người dùng xác nhận:
- **Nhân sự: OK**
- **Chụp → Lưu → Chờ → Đồng bộ: OK**
- Hàng `Chờ` tự về `0` sau đồng bộ.

Đây là mốc PASS thực tế. Không thay bằng candidate gần giống nếu chưa có xác nhận PASS mới hơn.

## Link updater PASS
`https://robotglass247.github.io/ghi-so-nuoc/update-final2-safe.html`

## Build
`879-final2-safe`

## File/commit chuẩn
- `update-final2-safe.html`
  - commit: `f19ea45fa13c7f2e9fe66ccdab80f38df81b6f30`
  - blob: `87ca328c548b372fa3f8c6ef2a89fa7188565bdd`
- `water-offline-sw-final2-safe.js`
  - commit: `df8cb7d9b4dd59e8da2f48d23cd6229439c9d89f`
  - blob: `327536547bde555ea1dd89c1d51faa2998beea48`
- `water-final-core-pre.js`
  - commit: `d721428b854bd682747d70f741dba83192fad161`
  - blob: `0ca1c810cdf3062af21cd26a805785ce7a4ac771`
- `water-final-core-post.js`
  - commit: `28c98454bdc84484c3ff1dfe214a4cb5c83f54d5`
  - blob: `e4f5ea0a08e3b8935dad074fb38efec89d3d04cd`
- `water-ui3.js` MAIN905 PASS
  - blob: `0ccf58b9ff1be0ec5faf06a3a201285d9cbac607`
- `water-shot-guide.js`
  - blob: `813ab39b9fa1357036c052dd4105b48ddd6e0057`

## Kiến trúc đã PASS
Trình tự nạp bắt buộc:
1. `water-final-core-pre.js` lưu lại các hàm lõi camera/QR hiện tại.
2. `water-ui3.js` nạp phần Nhân sự/tiến độ MAIN905.
3. `water-final-core-post.js` trả lại đúng hàm lõi `setStatus` và `acceptLiveQR`, tách observer UI cũ khỏi `statusSub` thật.
4. `water-shot-guide.js` chỉ làm nhiệm vụ hiển thị hướng dẫn/chụp.

Nhờ đó phần UI/Nhân sự không được phép ghi đè logic camera/QR của lõi SPEED3.

## Phần được khóa
Không sửa khi làm module khác:
- camera / QR
- `captureAndSave`
- `dbPut`
- IndexedDB `water_meter_v6`
- hàng Chờ
- Offline/local-first
- SPEED3 Turbo sync
- cơ chế xóa queue chỉ sau xác nhận đồng bộ
- Nhân sự MAIN905 hiện tại
- thứ tự `pre -> UI3 -> post -> guide`

## Ghi chú test
Lỗi candidate trước: chụp Online thực tế đã ghi record vào queue nhưng lớp UI làm luồng sau lưu rơi vào nhánh báo `CHƯA LƯU`. FINAL2 SAFE xử lý bằng cách bảo vệ và khôi phục các hàm lõi camera/QR, không sửa `captureAndSave` hay SPEED3.

## Quy tắc phục hồi
Nếu có lỗi phát sinh ở module khác, trước tiên phục hồi đúng updater/file/blob ở checkpoint này. Chỉ thay đúng module được yêu cầu, không tái ghép từ trí nhớ và không dùng candidate PENDING thay mốc PASS này.
