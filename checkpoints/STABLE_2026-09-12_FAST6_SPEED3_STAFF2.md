# STABLE CHECKPOINT – FAST6 SPEED3 + STAFF2

**Ngày chốt:** 2026-09-12

**Tên mốc:** `STABLE-2026-09-12-FAST6-SPEED3-STAFF2`

## Phạm vi Stable
- Lõi đồng bộ giữ nguyên SPEED3 TURBO đã Stable: 2 lane × tối đa 5 ảnh/lane.
- Không thay camera, QR, IndexedDB, Offline, queue hay cơ chế SPEED3.
- STAFF2 bổ sung quản lý trạng thái nhân sự.

## Kết quả STAFF2 đã PASS
Người dùng đã test trực tiếp trên App và xác nhận:
- thêm/cập nhật nhân sự đã phản ánh lên App;
- đổi `Đang làm việc` → `Đã nghỉ việc` thì nhân sự được loại khỏi danh sách App;
- đổi ngược lại sang `Đang làm việc` thì nhân sự xuất hiện lại ngay;
- regression cuối đã test OK sau khi hoàn thiện STAFF2.

## Sheet NHAN_SU_THUC_HIEN
- Cột F = `TÌNH TRẠNG`.
- F2:F1000 có Data Validation bắt buộc 2 giá trị:
  - `Đang làm việc`
  - `Đã nghỉ việc`
- strict = true.
- Nhân sự có trạng thái trống không được coi là đang làm việc.

Backup sheet trước khi sửa:
- Spreadsheet ID: `1EQ12X-mtp7PPq6SAF4L4-c_8jXrqabbvvJuCizQQRyg`

## Quy tắc backend STAFF2
Hàm trả danh sách nhân sự cho App chỉ trả nhân sự có trạng thái chính xác là `Đang làm việc` sau chuẩn hóa trim/lowercase.

`Đã nghỉ việc` hoặc trạng thái trống => không trả lên App.

Lưu ý an toàn: không sửa logic upload/queue để tránh làm kẹt ảnh Offline cũ đã chụp bởi một nhân sự sau này nghỉ việc.

## Backend Stable
- File: `STABLE_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF2_FULL.txt`
- SHA256: `ee7ad42d06b2e409b8c0a1f80ee9338970cae11b7773779dbd2327f52ad319ef`
- Drive ID: `13s14v6STaLll504tfcL9ay-0DMbxYa4I`

## Frontend STAFF2 đã test
- Candidate/test entry: `https://robotglass247.github.io/ghi-so-nuoc/staff2-app-test.html`
- Khi danh sách POST trả về, nếu mã nhân sự đang lưu trên máy không còn nằm trong danh sách đang làm việc, App yêu cầu chọn lại nhân sự hợp lệ.
- Người dùng xác nhận cập nhật trạng thái phản ánh ngay lên App.
- Người dùng xác nhận regression cuối: `đã test ok`.

## Trạng thái URL lõi
- `v87-background.html` vẫn giữ nguyên lõi FAST6 cũ để bảo vệ camera/Offline/SPEED3.
- Blob rollback frontend: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`.
- Service Worker trước tích hợp STAFF2: blob `349594da93e543d129b8950102d76546d5c1ad68`.
- Chưa overwrite URL lõi trong checkpoint này.

## Rollback
1. Backend STAFF2 Stable hiện tại: Drive ID `13s14v6STaLll504tfcL9ay-0DMbxYa4I`.
2. Backend SPEED3 trước STAFF2: Drive ID `1DXzq6GoO4BCyoav_y9WF-OTGJlPd0Ykn`.
3. SPEED2: Drive ID `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`.
4. SPEED1: Drive ID `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.

## Quy tắc tiếp theo
- STAFF2 được coi là PASS và Stable cho chức năng nhân sự động/trạng thái.
- Không sửa thêm backend nhân sự nếu không có lỗi thực tế.
- Không đẩy thay đổi vào lõi `v87-background.html` hoặc Service Worker nếu không có bước PENDING/test riêng và rollback rõ ràng.
