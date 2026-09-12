# STABLE CHECKPOINT – STAFF MAIN905 PASS

**Ngày chốt:** 2026-09-12

**Tên mốc:** `STABLE-2026-09-12-STAFF-MAIN905-PASS`

**Nhánh lưu nguyên trạng:** `stable/staff-main905-pass-20260912`

## Phạm vi đã PASS
Phần Nhân sự đã được người dùng kiểm tra thực tế và chốt PASS.

Các yêu cầu đã đạt:
- Danh sách nhân sự lấy động từ Google Sheet/backend.
- Chỉ hiển thị nhân sự có trạng thái `Đang làm việc`.
- Khi thay đổi trạng thái nhân sự, App cập nhật lại danh sách.
- Chỉ hiển thị tên, không hiển thị mã nhân sự.
- Dòng `CHỌN NGƯỜI THỰC HIỆN` hiển thị một hàng.
- Danh sách chọn nhân sự dùng HTML tùy biến, không dùng menu `<select>` native của Android.
- Chiều cao mỗi dòng gọn theo chữ.
- Chiều ngang danh sách tự tính theo tên dài nhất, có giới hạn theo màn hình.
- Người đang được chọn có dấu ✓.
- Mã nhân sự vẫn được lưu nội bộ bằng `water_staff` để backend/ghi số hoạt động đúng.

## Nguồn hiện tại
- `water-ui3.js`: chứa lớp UI/POST bridge và khối `STAFF_COMPACT_MAIN905`.
- `v87-background.html`: chứa dữ liệu nhân sự nền, cache/fallback và khóa `water_staff`.

## Quy tắc khóa
Từ mốc này:
1. Phần Nhân sự được coi là ổn định và không chỉnh cùng lúc với camera/lưu ảnh/Offline/queue/đồng bộ.
2. Khi có yêu cầu sửa Nhân sự, chỉ sửa phạm vi Nhân sự và regression riêng phần này.
3. Không thay `water_meter_v6`, `captureAndSave()`, `dbPut()`, `syncQueue()`, Service Worker Offline hoặc cơ chế SPEED3 khi chỉ sửa Nhân sự.
4. Trước mọi thay đổi Nhân sự, lấy nhánh `stable/staff-main905-pass-20260912` làm mốc đối chiếu/rollback.
5. Mọi bản sửa Nhân sự sau này phải tạo build/checkpoint mới; không ghi đè mốc PASS này.

## Trạng thái
**PASS / LOCKED**

Mốc này được giữ riêng để có thể khôi phục phần Nhân sự mà không phụ thuộc các thay đổi về lưu ảnh, Offline hoặc đồng bộ sau đó.
