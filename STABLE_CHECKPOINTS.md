# STABLE CHECKPOINTS – GHI SỔ NƯỚC

## Quy ước phát triển

Từ 2026-09-11, sau mỗi lần điều chỉnh/sửa đổi/nâng cấp mà người dùng xác nhận test chạy ổn định, phải tạo một **stable checkpoint** trong file này trước khi tiếp tục phát triển.

Mỗi stable checkpoint phải ghi tối thiểu:
- Ngày giờ xác nhận.
- Tên mốc/version.
- Commit SHA làm mốc chuẩn.
- Link chạy/launcher liên quan.
- Các file đã thay đổi ở mốc đó.
- Các chức năng đã được người dùng thực tế xác nhận.
- Các chức năng chưa test/chưa xác nhận.
- Commit rollback về mốc chuẩn.
- Ghi chú các vùng lõi không được phép sửa khi chỉ làm giao diện.

Nguyên tắc làm việc:
1. Chỉ coi một bản là **STABLE** khi người dùng xác nhận trực tiếp sau test thực tế.
2. Bản chưa được xác nhận chỉ ghi **PENDING TEST**, không dùng làm cơ sở ổn định cho lần nâng cấp sau.
3. Trước mỗi thay đổi mới phải đối chiếu với stable checkpoint gần nhất.
4. Nếu thay đổi mới gây lỗi, ưu tiên quay về stable checkpoint gần nhất thay vì tiếp tục vá chồng.
5. Thay đổi giao diện không được ghi đè các hàm lõi nghiệp vụ như `captureAndSave()`, `captureQRFastAndAccurate()`, `dbPut()`, `syncQueue()`, `scheduleAutoSync()`, `acceptLiveQR()`, `setStatus()` hoặc thay đổi cơ chế Service Worker nếu tác vụ chỉ là UI.
6. Không xóa IndexedDB/ảnh đang Chờ chỉ để xử lý cache hoặc giao diện.

---

## STABLE-2026-09-10-FAST6

**Trạng thái:** STABLE – đã được người dùng xác nhận trong trao đổi ngày 2026-09-11 rằng bản fast6 hôm trước đã chạy OK trước khi sửa giao diện.

- Mốc commit chuẩn: `785576ec07d49055866374c444aa1356faeea722`
- Commit chứa sửa fast6 nhân sự chính: `080fd952854f276ec7c4f97a7a0149bff89e8fbe`
- Cache Service Worker: `water-v878-offline-fast6`
- Trang chạy lõi: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`
- Service Worker: `water-offline-sw.js`
- Backend upload/đồng bộ giữ nguyên: `AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8`
- Backend nhân sự động tách riêng: `AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ`

### Người dùng đã xác nhận ổn
- Online/Offline hoạt động.
- Chụp và lưu ảnh hoạt động.
- Cập nhật nhân sự hoạt động.

### Chưa ghi nhận xác nhận riêng ở mốc này
- Chụp thay thế Offline: cần test lại nếu dùng làm tiêu chí phát hành chính thức.
- Các thay đổi giao diện UI3 về sau không thuộc mốc fast6 stable này.

### Rollback target
`785576ec07d49055866374c444aa1356faeea722`

---

## PENDING-2026-09-11-FAST6-RESTORE

**Trạng thái:** PENDING TEST – chưa được phép coi là stable cho tới khi người dùng xác nhận lại sau test.

- Đã khôi phục `water-offline-sw.js` theo fast6 lên nhánh main.
- Commit khôi phục Service Worker fast6: `7c7680236383d49cbdf5ff55b0a43a348be75d8a`
- Commit tạo launcher khôi phục một lần: `e62e290e9209ec7e3f079f268e2fe7cdd8469691`
- Link khôi phục một lần: `https://robotglass247.github.io/ghi-so-nuoc/restore-fast6.html`
- Link test lõi sau khôi phục: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`

### Cần người dùng xác nhận
- Online mở được.
- Online chụp/lưu được.
- Đồng bộ được.
- Offline mở được.
- Offline chụp/lưu được.
- Chụp thay thế Offline nếu cần khóa chức năng này trong mốc tiếp theo.

Khi toàn bộ tiêu chí cần thiết được xác nhận, đổi mục này thành STABLE và ghi commit chuẩn mới.
