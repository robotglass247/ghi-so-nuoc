# STABLE – PROGRESS 84 / 54 PASS

**Ngày xác nhận:** 2026-09-13

## Trạng thái
**PASS – LOCKED RIÊNG MODULE TIẾN ĐỘ**

## Xác nhận trực tiếp
Người dùng xác nhận sau khi thay backend và deploy: **“Đã lên OK.”**

Hàng tiến độ trên app đã hiển thị đúng:
- **Tổng: 84**
- **Đã chụp: 54**
- **Chưa chụp: 30**

## Backend chuẩn đã PASS
File đã deploy thủ công trong Apps Script:
`Ma.gs_PROGRESS_84_54_THEO_BAN_CU_OK.txt`

Bản lưu ổn định trên Google Drive:
`STABLE_2026-09-13_Ma.gs_PROGRESS_84_54_PASS_FULL.txt`

- Drive ID: `1x-Vva4Jb65mgFZilUhoscmPewDtPAOid`
- SHA256: `7c7dc04a1e63d2a788f1b01e3e9d16dfc0fb4a98148de56eee79505e293def4d`
- Kích thước: `149407` bytes

## Quy tắc tính đã PASS
- **Tổng**: lấy theo STT lớn nhất trong `DANH_MUC_DONG_HO` → hiện là `84`.
- **Đã chụp**: lấy số `Tổng lượt ghi trong kỳ` từ `DASHBOARD_V2`, kỳ hiện tại → hiện là `54`.
- **Chưa chụp**: `Tổng - Đã chụp` → `30`.
- Có nhánh dự phòng nếu Dashboard không trả đúng kỳ.

## Frontend đang dùng khi PASS
- Updater: `update-final10-postcapture-r5-nameonly.html`
  - blob: `0037bbd5da134c20283cc1e1811a2d861e50a69f`
- Service worker wrapper: `water-offline-sw-final10-postcapture-r5-nameonly.js`
  - blob: `b4ae80d34853319d5b59776439a9c10c647b947c`
- Staff header addon: `water-staff-header-nameonly-r5.js`
  - blob: `a7534a86fc365efab22187703d9ce65f51728106`
- UI bridge: `water-ui3.js`
  - blob: `0ccf58b9ff1be0ec5faf06a3a201285d9cbac607`

## Phạm vi khóa
Khi tối ưu thời gian cập nhật tiến độ, **không sửa công thức/tính số đã PASS ở backend** và không sửa:
- camera / QR
- `captureAndSave`
- IndexedDB `water_meter_v6`
- queue / hàng Chờ
- Offline/local-first
- SPEED3 Turbo
- tab cảnh báo R4
- nhân sự name-only R5

Chỉ được sửa lớp **thời điểm/nhịp refresh tiến độ** trên frontend, trừ khi người dùng yêu cầu khác.
