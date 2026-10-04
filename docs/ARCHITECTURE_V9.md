# KIẾN TRÚC V9 – GHI SỐ NƯỚC NHIỀU DỰ ÁN

## 1. Mục tiêu

Kiến trúc V9 áp dụng nguyên tắc: **một bộ lõi dùng chung – mỗi dự án chỉ có cấu hình riêng**.

Mục tiêu chính:
- Không sửa URL backend, tên sheet, mã dự án, tên dự án rải rác trong mã.
- Tách từng chức năng thành module độc lập để sửa một phần không ảnh hưởng phần khác.
- Dữ liệu localStorage, IndexedDB, cache và Service Worker phải có namespace theo dự án để không lẫn dữ liệu khi cùng một thiết bị chạy nhiều dự án.
- Bản production chỉ lấy từ nhánh/mốc stable; thử nghiệm luôn thực hiện trên nhánh riêng.
- Nhân bản dự án mới bằng cách copy một file cấu hình mẫu và triển khai backend tương ứng.

## 2. Cấu trúc thư mục chuẩn

```text
ghi-so-nuoc/
├─ app/
│  ├─ index.html
│  ├─ assets/
│  │  └─ app.css
│  └─ src/
│     ├─ bootstrap.js
│     ├─ config/
│     │  ├─ defaults.js
│     │  └─ project.config.js
│     ├─ core/
│     │  ├─ errors.js
│     │  ├─ logger.js
│     │  ├─ storage.js
│     │  └─ event-bus.js
│     ├─ api/
│     │  └─ backend-client.js
│     ├─ db/
│     │  └─ queue.repository.js
│     └─ modules/
│        ├─ staff/
│        │  ├─ staff.service.js
│        │  └─ staff.ui.js
│        ├─ camera/
│        │  └─ camera.service.js
│        ├─ qr/
│        │  └─ qr.service.js
│        ├─ capture/
│        │  └─ capture.service.js
│        ├─ meter/
│        │  └─ meter.service.js
│        ├─ sync/
│        │  └─ sync.service.js
│        ├─ offline/
│        │  └─ offline.service.js
│        └─ ui/
│           └─ status.ui.js
├─ sw/
│  └─ service-worker.js
├─ projects/
│  ├─ _template/
│  │  └─ project.config.js
│  └─ <PROJECT_ID>/
│     └─ project.config.js
├─ backend/
│  ├─ 00_Config.gs
│  ├─ 10_Router.gs
│  ├─ 20_Staff.gs
│  ├─ 30_Upload.gs
│  ├─ 40_SyncStatus.gs
│  ├─ 50_MeterData.gs
│  ├─ 60_AI.gs
│  └─ 90_Utils.gs
├─ tests/
│  ├─ smoke/
│  └─ regression/
├─ docs/
│  ├─ ARCHITECTURE_V9.md
│  ├─ CLONE_PROJECT.md
│  └─ CHANGE_RULES.md
├─ archive/
│  ├─ patches/
│  ├─ diagnostics/
│  └─ old-builds/
└─ checkpoints/
```

## 3. Ranh giới module frontend

### config
Chỉ chứa thông tin thay đổi theo dự án hoặc theo môi trường. Không xử lý nghiệp vụ.

### core
Hạ tầng dùng chung: log, lỗi, event bus, namespace storage. Module nghiệp vụ không được tự tạo key localStorage tùy ý.

### api/backend-client
Là cổng duy nhất gọi Apps Script. Module khác không được tự nối URL backend.

### staff
Tải danh sách nhân sự, lọc trạng thái, cache và hiển thị lựa chọn nhân sự. Mã nhân sự giữ nội bộ; UI có thể chỉ hiện họ tên.

### camera
Xin quyền camera, chọn camera sau, play/stop, constraints, focus/exposure. Không chứa QR hoặc upload.

### qr
Chuẩn hóa mã đồng hồ, parse QR mới/cũ, BarcodeDetector/jsQR và xác nhận QR. Không ghi dữ liệu.

### capture
Điều phối một lần bấm chụp: xác nhận QR -> tạo ảnh -> tạo record -> đưa vào queue. Không trực tiếp upload.

### meter
Quy tắc mã đồng hồ/căn hộ, kỳ ghi số, kiểm tra trùng, mã legacy.

### db/queue.repository
Duy nhất chịu trách nhiệm IndexedDB: put/get/delete/count/migration. Tên database bắt buộc có PROJECT_ID.

### sync
Đọc queue, upload, kiểm tra ACK/batchstatus, retry, chống trùng clientId. Không can thiệp camera.

### offline
Đăng ký Service Worker, kiểm tra cache sẵn sàng, version cache, cập nhật build offline.

### ui
Chỉ cập nhật trạng thái, toast, modal và các nút. Không gọi backend trực tiếp.

## 4. Ranh giới backend Apps Script

Apps Script có thể giữ file phẳng nhưng đặt số thứ tự để chức năng luôn nằm đúng nhóm.

- `00_Config.gs`: Spreadsheet ID, folder ID, tên sheet, PROJECT_ID, feature flags.
- `10_Router.gs`: `doGet`, `doPost`, định tuyến API.
- `20_Staff.gs`: danh sách nhân sự đang làm việc.
- `30_Upload.gs`: nhận ảnh và lưu dữ liệu đầu vào.
- `40_SyncStatus.gs`: ACK, batchstatus, nhật ký đồng bộ.
- `50_MeterData.gs`: danh mục đồng hồ, kỳ đầu, dữ liệu kỳ.
- `60_AI.gs`: đọc số nước/OCR/AI và xử lý nền.
- `90_Utils.gs`: hàm dùng chung, parse, date, lock, response.

**Quy tắc bắt buộc:** ID Google Sheet/Drive và tên sheet chỉ được khai báo trong `00_Config.gs`.

## 5. Quy tắc cấu hình nhiều dự án

Mỗi dự án có một `PROJECT_ID` duy nhất, ví dụ:
- `ERPK_PARK3`
- `TAYHO_A01`
- `DEMO_FREE`

Tất cả dữ liệu phía trình duyệt phải dùng namespace:

```text
water:<PROJECT_ID>:staff
water:<PROJECT_ID>:staff_cache
water:<PROJECT_ID>:capture:<period>:<meter>
IndexedDB: water_<PROJECT_ID>_v1
Cache: water-<PROJECT_ID>-<build>
```

Nhờ đó cùng một điện thoại có thể mở nhiều dự án mà không lấy nhầm nhân sự, queue hay ảnh của dự án khác.

## 6. Luồng khởi động chuẩn

```text
index.html
  -> project.config.js
  -> defaults.js
  -> bootstrap.js
      -> validateConfig()
      -> initStorageNamespace()
      -> initDB()
      -> initStaff()
      -> initQR()
      -> initCamera()
      -> initSync()
      -> initOffline()
      -> renderReady()
```

Nếu cấu hình thiếu `PROJECT_ID` hoặc `BACKEND_URL`, app phải dừng và báo lỗi rõ ràng, tuyệt đối không chạy với giá trị ngầm.

## 7. Quy tắc version

Tách 3 version độc lập:
- `APP_VERSION`: giao diện/lõi frontend, ví dụ `9.0.0`.
- `CONFIG_VERSION`: cấu trúc file cấu hình, ví dụ `1`.
- `DATA_SCHEMA_VERSION`: cấu trúc IndexedDB/record, ví dụ `1`.

Không dùng chuỗi kiểu `fast6-staff2-speed3` làm định danh chính trong mã production. Các tên benchmark có thể giữ trong checkpoint/release note.

## 8. Quy tắc thay đổi

1. Không sửa production trực tiếp.
2. Một thay đổi chỉ chạm module liên quan.
3. Trước khi merge: smoke test module + regression camera/QR/offline/queue/sync/staff.
4. Mọi thay đổi schema phải có migration.
5. Không xóa queue/cache của người dùng để xử lý lỗi giao diện.
6. Patch và file test sau khi chốt phải chuyển vào `archive/`, không để lẫn cùng file production.

## 9. Chiến lược chuyển từ V8.7 sang V9

Chuyển từng bước, không viết lại toàn bộ một lần:

- Giai đoạn 1: tách `project.config` + namespace dự án.
- Giai đoạn 2: tách staff và backend-client.
- Giai đoạn 3: tách IndexedDB/queue và sync.
- Giai đoạn 4: tách QR/camera/capture.
- Giai đoạn 5: thay Service Worker bằng bản dùng cấu hình/build chuẩn.
- Giai đoạn 6: regression toàn bộ rồi mới chuyển URL production.

Trong suốt quá trình, V8.7 stable vẫn giữ nguyên làm rollback.
