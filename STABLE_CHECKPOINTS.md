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

## STABLE-2026-09-11-FAST6-RESTORE-SYNC

**Trạng thái:** STABLE – người dùng xác nhận trực tiếp ngày 2026-09-11 rằng hàng `Chờ` đã về `0` sau khi sửa chuẩn hóa mã và xác thực token theo `DANH_MUC_DONG_HO`.

### Frontend / Offline
- Giữ lõi FAST6 `v87-background.html`.
- Blob SHA của `v87-background.html`: `ec6f9084a5a36e54a76b0131e551ad5b9f5779d4`.
- Commit khôi phục Service Worker FAST6: `7c7680236383d49cbdf5ff55b0a43a348be75d8a`.
- Commit launcher khôi phục một lần: `e62e290e9209ec7e3f079f268e2fe7cdd8469691`.
- Cache Service Worker: `water-v878-offline-fast6`.
- Link chạy chuẩn: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`.
- Link khôi phục một lần nếu cần: `https://robotglass247.github.io/ghi-so-nuoc/restore-fast6.html`.

### Backend đồng bộ stable
- Backend upload/đồng bộ: `AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8`.
- Backend nhân sự động: `AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ`.
- Snapshot backend stable: `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt`.
- SHA256 snapshot backend stable: `9b5b75e4eeb5fd03d44cb5992dfbc872930b94a4fe2d12c5793ad274dd5cdad8`.
- Kích thước snapshot backend: `117883 bytes`.

### Lỗi đã xác định và sửa
- FAST6 có thể gửi mã dạng mới như `P3-309` trong khi danh mục tồn tại mã legacy như `P3309N01`.
- Backend chuẩn hóa các dạng `P3-309`, `P3-309-N01`, `P3309N01` về cùng khóa tra cứu `P3309`; tương tự `RA-112` / `RA112N01` -> `RA112`.
- Sau khi sửa chuẩn hóa mã, một số QR/token legacy khác vẫn bị backend từ chối.
- Cách sửa stable: ưu tiên token tính theo secret hiện tại; nếu không khớp thì chỉ chấp nhận token chính xác đang lưu trong `DANH_MUC_DONG_HO` của đúng đồng hồ, đọc từ Nội dung QR hoặc Link Web App. Không chấp nhận token lạ ngoài danh mục.
- `waterMeterState_()` và `nhanAnhTuOffline()` dùng cùng chuẩn xác thực token để tránh lệch logic giữa kiểm tra và đồng bộ.
- Backend tiếp tục dùng Client ID để chống ghi trùng.

### Bằng chứng đồng bộ
- RAW ACK PASS cho `P3-309_1789100271783_ucpy8u57w8a`.
- `NHAT_KY_DONG_BO` ghi bản trên lúc `11/09/2026 20:23:06`, NS007, có File ID Drive.
- Khi gặp QR legacy khác, RAW ACK chỉ ra lỗi thật `QR hoặc mã lần chụp không hợp lệ`.
- Sau khi deploy `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt`, RAW ACK PASS cho `P3316N01_1789111563156_r3dotoudqd`.
- Người dùng xác nhận số `Chờ` tiếp tục giảm và cuối cùng **đã về 0**.
- `HANG_DOI_ANH_V87` và `NHAT_KY_DONG_BO` đã nhận dữ liệu trong quá trình đồng bộ.

### Kết quả test thực tế
- PASS – Online mở được.
- PASS – Online chụp/lưu ảnh được.
- PASS – Offline mở được.
- PASS – Offline chụp/lưu ảnh được.
- PASS – Online đồng bộ toàn bộ hàng Chờ; `Chờ = 0`.
- PASS – Backend nhận ảnh vào `HANG_DOI_ANH_V87` / `NHAT_KY_DONG_BO`.
- Chưa xác nhận lại đầy đủ – Chụp thay thế Offline sau backend token catalog.

### Vùng lõi phải khóa khi nâng cấp giao diện
- Không ghi đè `captureAndSave()`.
- Không ghi đè `captureQRFastAndAccurate()`.
- Không ghi đè `dbPut()`.
- Không ghi đè `syncQueue()` / `scheduleAutoSync()`.
- Không ghi đè `acceptLiveQR()` / `setStatus()`.
- Không thay Service Worker/cache/launcher khi tác vụ chỉ là giao diện.
- Không thay `BACKEND_URL` upload/đồng bộ nếu không có bài test riêng.
- Không thay cơ chế xác thực token/mã stable nếu không có test regression riêng.
- Không xóa IndexedDB hoặc ảnh đang Chờ để xử lý giao diện/cache.

### Rollback / đối chiếu
- Frontend FAST6 rollback target gốc: `785576ec07d49055866374c444aa1356faeea722`.
- Service Worker restore commit: `7c7680236383d49cbdf5ff55b0a43a348be75d8a`.
- Backend stable đối chiếu: `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt` – SHA256 `9b5b75e4eeb5fd03d44cb5992dfbc872930b94a4fe2d12c5793ad274dd5cdad8`.

**Quy tắc tiếp theo:** mọi sửa giao diện phải lấy mốc `STABLE-2026-09-11-FAST6-RESTORE-SYNC` này làm chuẩn. UI chỉ được đọc/mirror trạng thái và thay CSS/DOM hiển thị; không được can thiệp vào camera, QR, lưu IndexedDB, Offline, đồng bộ, Service Worker hoặc backend stable.

---

## PENDING-2026-09-11-FAST6-SYNC-SPEED1

**Trạng thái:** PENDING SPEED TEST – chưa thay thế mốc stable phía trên.

### Baseline đo từ NHAT_KY_DONG_BO
- Đoạn gửi liên tục 9 ảnh từ `20:43:22` đến `20:44:42` có khoảng cách lần lượt `11, 16, 8, 7, 10, 10, 9, 9` giây.
- Trung bình thực tế khoảng **10,0 giây/ảnh**.

### Điểm nghẽn đã xác định
- Frontend xử lý tuần tự 1 ảnh/lượt; khoảng nghỉ giữa hai ảnh chỉ khoảng 100 ms nên không phải nút thắt chính.
- `uploadAndConfirm()` khởi động `batchstatus` GET/JSONP sau 3 giây dù trên trình duyệt test kênh GET/JSONP đã được xác nhận lỗi; direct POST/ACK mới là kênh hoạt động.
- Backend stable có thể đọc `DANH_MUC_DONG_HO` hai lần trong cùng một upload: một lần xác thực token legacy và một lần tra đồng hồ.
- Đường nhận ảnh gọi `SpreadsheetApp.flush()` nhiều lần trước ACK.
- Trigger AI nền dùng cùng `ScriptLock`, có thể tranh tài nguyên với burst upload.

### Candidate backend SPEED1
- File: `Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`.
- SHA256: `fada3a63f9ac01ce48d461a5ec3e557beab385aa1db7a225d0d4f8f069c31790`.
- Giữ nguyên frontend FAST6 stable.
- Mỗi upload chỉ đọc `DANH_MUC_DONG_HO` một lần cho cả tra mã + token.
- Bỏ explicit `SpreadsheetApp.flush()` trong đường ACK nhận ảnh; để Apps Script commit khi execution kết thúc.
- Khi đang có burst upload, AI nền nhường khoảng 20 giây để tránh tranh `ScriptLock`; sau đó trigger AI tự chạy lại bình thường.
- Không thay camera, QR, IndexedDB, `syncQueue()`, Service Worker, BACKEND_URL, Client ID hoặc quy tắc xác thực token stable.

### Tiêu chí test trước khi nâng STABLE
- Chụp/lưu Online vẫn PASS.
- Offline mở/chụp/lưu vẫn PASS.
- Đồng bộ hàng Chờ về 0.
- `HANG_DOI_ANH_V87` và `NHAT_KY_DONG_BO` đủ bản ghi.
- Đo ít nhất 5–10 ảnh liên tục; mục tiêu SPEED1 là giảm rõ rệt so với baseline 10 giây/ảnh.
- Nếu lỗi: rollback ngay về `Ma.gs_FAST6_TOKEN_CATALOG_FULL.txt` SHA256 `9b5b75e4eeb5fd03d44cb5992dfbc872930b94a4fe2d12c5793ad274dd5cdad8`.

### Giai đoạn 2 nếu SPEED1 vẫn chưa đủ nhanh
- Không upload song song ngay vì backend đang dùng `ScriptLock`; gửi song song lúc này chỉ làm tăng tranh chấp/retry.
- Muốn tăng tốc lớn hơn cần thiết kế batch 3–5 ảnh/request hoặc rút ngắn phạm vi lock. Đây là thay đổi lớn hơn và chỉ thực hiện sau khi SPEED1 test ổn định.
