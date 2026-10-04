# NHÂN BẢN MỘT DỰ ÁN MỚI

Mục tiêu: nhân bản dự án mà không sửa mã lõi.

## Các bước chuẩn

1. Tạo `PROJECT_ID` duy nhất, không dấu, không khoảng trắng. Ví dụ `TAYHO_A01`.
2. Copy `projects/_template/project.config.js` thành `projects/TAYHO_A01/project.config.js`.
3. Chỉ sửa các trường cấu hình của dự án: tên, mã, Apps Script Web App URL và tùy chọn tính năng nếu cần.
4. Copy backend template Apps Script, sau đó chỉ sửa `00_Config.gs`: Spreadsheet ID, Drive Folder ID, PROJECT_ID và tên sheet nếu dự án dùng tên khác chuẩn.
5. Chạy checklist smoke/regression trước khi phát URL cho nhân sự vận hành.

## Những phần KHÔNG được sửa khi nhân bản

- Camera service.
- QR parser/scanner.
- Queue/IndexedDB repository.
- Sync engine.
- Staff module.
- Service Worker core.
- Quy tắc clientId/chống trùng.

Nếu một dự án cần hành vi khác, ưu tiên thêm feature flag trong `project.config.js`; không copy module rồi sửa riêng cho từng dự án.

## Checklist cấu hình

- `project.id` duy nhất.
- `project.name` đúng tên hiển thị.
- `backend.url` đúng deployment Apps Script của dự án.
- Spreadsheet/Drive backend đúng dự án.
- Nhân sự chỉ lấy trạng thái `Đang làm việc`.
- localStorage/IndexedDB/cache có namespace theo PROJECT_ID.
- Online PASS.
- Offline PASS.
- Camera PASS.
- QR mới + QR legacy PASS.
- Chụp và queue PASS.
- Đồng bộ và NHAT_KY_DONG_BO PASS.
- Kiểm tra bản ghi trùng PASS.

## Quy tắc đặt tên deployment

Khuyến nghị:

```text
Frontend:  water-<PROJECT_ID>
Backend:   WATER_<PROJECT_ID>_BACKEND
Database:  water_<PROJECT_ID>_v<schema>
Cache:     water-<PROJECT_ID>-<APP_VERSION>-<build>
```

## Nguyên tắc quan trọng

Một dự án mới phải được tạo bằng **cấu hình**, không bằng cách tìm-thay thế hàng loạt URL/tên sheet trong mã nguồn. Nếu phải sửa từ 2 file trở lên chỉ để đổi tên hoặc URL dự án, kiến trúc đang bị sai và cần đưa giá trị đó trở lại config.
