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

## PENDING-2026-09-11-FAST6-RESTORE-SYNC

**Trạng thái:** PENDING TEST – phần Online/Offline/chụp/lưu đã PASS; đồng bộ Online đang tiếp tục chạy sau khi sửa xác thực token theo danh mục, nhưng chưa xác nhận hàng Chờ về 0.

### Frontend / Offline
- Giữ lõi FAST6 `v87-background.html`.
- Blob SHA hiện tại của `v87-background.html`: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`.
- Commit khôi phục Service Worker FAST6: `7c7680236383d49cbdf5ff55b0a43a348be75d8a`.
- Commit launcher khôi phục một lần: `e62e290e9209ec7e3f079f268e2fe7cdd8469691`.
- Cache Service Worker: `water-v878-offline-fast6`.
- Link chạy chuẩn: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`.
- Link khôi phục một lần nếu cần: `https://robotglass247.github.io/ghi-so-nuoc/restore-fast6.html`.

### Backend đồng bộ
- Backend upload/đồng bộ: `AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8`.
- Backend nhân sự động: `AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ`.
- Backend trước bước token catalog: `Ma.gs_FAST6_FIX_P3309_FULL.txt`.
- Backend đang test hiện tại: `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt`.
- Nguyên tắc xác thực hiện tại: ưu tiên token tính theo secret hiện tại; nếu không khớp, chỉ chấp nhận token chính xác đã lưu trong `DANH_MUC_DONG_HO` của đúng đồng hồ.

### Lỗi đã xác định và sửa
- FAST6 gửi mã như `P3-309`; danh mục có dữ liệu legacy như `P3309N01`.
- Backend đã được sửa chuẩn hóa để coi `P3-309`, `P3-309-N01`, `P3309N01` là cùng đồng hồ `P3309`.
- Sau đó hàng đợi tiếp tục gặp QR/token thuộc thế hệ cũ khác và backend trả lỗi thật `QR hoặc mã lần chụp không hợp lệ`.
- Cách sửa tổng quát mới: không đoán từng đời token; đối chiếu token chính xác với `DANH_MUC_DONG_HO` của đúng đồng hồ.
- RAW ACK sau sửa đã PASS cho Client ID `P3316N01_1789111563156_r3dotoudqd`.

### Bằng chứng đồng bộ thực tế
- RAW ACK trước đó đã PASS cho `P3-309_1789100271783_ucpy8u57w8a`; `NHAT_KY_DONG_BO` có bản ghi và File ID Drive.
- Sau sửa chuẩn hóa mã, người dùng xác nhận `Chờ 19 -> 13` và server nhận nhiều ảnh thật.
- Tại `Chờ 13`, RAW ACK chỉ ra lỗi token/QR legacy.
- Sau khi deploy `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt`, RAW ACK chuyển xanh cho `P3316N01_1789111563156_r3dotoudqd`.
- Người dùng xác nhận trực tiếp: **“Bạn sửa đúng, chờ đang giảm”**.

### Kết quả test thực tế hiện tại
- PASS – Online mở được.
- PASS – Online chụp/lưu ảnh được.
- PASS – Offline mở được.
- PASS – Offline chụp/lưu ảnh được.
- PASS PARTIAL – Online đồng bộ đang tiếp tục giảm Chờ sau sửa token catalog.
- PASS PARTIAL – Backend đang nhận ảnh vào `HANG_DOI_ANH_V87` / `NHAT_KY_DONG_BO`.
- Chưa xác nhận – Hàng Chờ về 0.
- Chưa xác nhận lại đầy đủ – Chụp thay thế Offline sau backend token catalog.

### Vùng lõi phải khóa
- Không ghi đè `captureAndSave()`.
- Không ghi đè `captureQRFastAndAccurate()`.
- Không ghi đè `dbPut()`.
- Không ghi đè `syncQueue()` / `scheduleAutoSync()` khi xử lý lỗi backend/token.
- Không ghi đè `acceptLiveQR()` / `setStatus()`.
- Không thay Service Worker/cache/launcher khi tác vụ chỉ là backend/token hoặc giao diện.
- Không thay `BACKEND_URL` upload/đồng bộ nếu không có bài test riêng.
- Không xóa IndexedDB hoặc ảnh đang Chờ để xử lý giao diện/cache.

### Rollback / đối chiếu
- Frontend FAST6 rollback target gốc: `785576ec07d49055866374c444aa1356faeea722`.
- Service Worker restore commit: `7c7680236383d49cbdf5ff55b0a43a348be75d8a`.
- Backend đối chiếu ngay trước token catalog: `Ma.gs_FAST6_FIX_P3309_FULL.txt`.
- Backend ứng viên stable hiện tại: `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt`.

**Quy tắc tiếp theo:** chưa sửa giao diện hay lõi. Để đồng bộ chạy tiếp. Chỉ khi hàng Chờ về 0 và người dùng xác nhận không còn ảnh lỗi mới nâng mốc này thành STABLE hoàn chỉnh. Nếu dừng ở một ảnh khác, dùng RAW ACK để lấy đúng lỗi của ảnh đầu tiên đang chặn, không sửa theo giả thuyết.
