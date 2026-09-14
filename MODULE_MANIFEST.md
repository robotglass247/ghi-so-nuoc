# MODULE MANIFEST - MODULAR RELEASE V1

## FROZEN - KHÔNG SỬA KHI LÀM UI QUẢN LÝ
- frozen-v1-water-final-core-pre.js
- frozen-v1-water-ui3.js
- frozen-v1-water-final-core-post.js
- frozen-v1-water-camera-fast-final6.js
- frozen-v1-water-shot-guide-final10-postcapture-r4.js
- frozen-v1-water-staff-header-nameonly-r5.js
- frozen-v1-water-progress-live-r6.js
- frozen-v1-water-top-tabs-r9.js
- frozen-v1-water-project-tab-r91.js
- frozen-v1-water-project-sheet-r93.js
- frozen-v1-water-default-capture-r92.js
- frozen-v1-water-manage-layout.js

## MODULE QUẢN LÝ
- 03_manage-core-v1.js: cấu hình + helper dùng chung.
- 03A_manage-data-card-v1.js: chỉ DOM/CSS card DỮ LIỆU GHI CHỈ SỐ.
- 04_month-selector-v1.js: chỉ Chọn Tháng.
- 05_download-xlsx-v1.js: chỉ TẢI FILE / workbook 8 cột.
- 06_view-sheet-v1.js: chỉ XEM CHỈ SỐ.
- 07_system-file-v1.js: chỉ FILE HỆ THỐNG + quyền + thông báo 2 giây.
- 08_manage-status-v1.js: chỉ dòng trạng thái.

## QUY TẮC
PASS = FREEZE.
Sửa chức năng nào chỉ sửa module chức năng đó.
Không nhúng Base64 module nghiệp vụ vào loader.
Không nạp module cũ song song.
Sau khi runtime test PASS, khóa HASHES_SHA256.json làm checkpoint.
