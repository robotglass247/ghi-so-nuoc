# V20 APP + CHỤP SỐ — LOCK CHECKPOINT

Ngày khóa: 2026-09-30
Trạng thái: PASS / FROZEN
Phạm vi: Truy cập App + Tab CHỤP SỐ

## Quy tắc khóa

- Không sửa trực tiếp các file/bộ lệnh dưới đây khi làm các phần tiếp theo.
- Mọi chức năng mới phải ưu tiên module/file mới hoặc chỉnh phần ngoài phạm vi khóa.
- Nếu bắt buộc sửa file khóa, phải có xác nhận của Anh trước, backup file hiện tại, đối chiếu SHA và test lại toàn bộ checklist PASS.
- Checkpoint này là mốc rollback chuẩn cho phần Truy cập App + Chụp số.

## File khóa và SHA chuẩn

### A. Truy cập App / Loader / Router

- r1135-v20-direct.html — `3fb4697c036c539f8877d285d34e82cb5f779e32`
- r9-direct-1135.html — `ffcf6bb5460b93254e56ac7c07309d709885d29b`
- v87-background.html — `55449aa64d40871db19b4e346e69449171dcc64b`
- water-project-router-v1.js — `3ceecc0d31c97cd38ea621127284da5c5cbebcaf`

### B. Chụp số / Camera / QR

- water-final-core-pre.js — `0ca1c810cdf3062af21cd26a805785ce7a4ac771`
- water-ui3-project-fast-v1.js — `f5e7e861ebdf091658a712c811898fb6a47a9f55`
- water-final-core-post.js — `e4f5ea0a08e3b8935dad074fb38efec89d3d04cd`
- water-camera-fast-final6.js — `737adc177cfb97460e4bf5bce89c8fbad0d73535`
- water-shot-guide-final10-postcapture-r4.js — `9b2bea94f2e1e4f649f73aa451a4789bb3b0aa33`
- water-default-capture-r92.js — `cbda9c1ba5606f31a93b6741c14186b84a6ddb05`

### C. Nhân sự / Tiến độ / Đồng bộ / Chờ lỗi

- water-staff-header-nameonly-r5.js — `a7534a86fc365efab22187703d9ce65f51728106`
- water-progress-authority-v1.js — `506ef7b485d719df6c72857aa11bdb42e99a77e4`
- water-sync-diagnostic-v1.js — `22b351cb715f7e2eb9699483fc8350563bcf9b33`
- water-queue-staff-repair-v1.js — `96fb90be49335826e34093f5ae51b185a93c1209`
- water-queue-invalid-qr-v1.js — `f399c3eac8d7011be2afc3e8a083275b4860cd93`

### D. Tab / vị trí giao diện liên quan CHỤP SỐ

- water-top-tabs-r9.js — `f0c1951935b966e9deb1f0af876df04be409889c`

## Checklist PASS đã khóa

- Mở App đúng TEST5.
- Không còn nhảy `Tổng: 80`.
- Nhân sự hiển thị/chọn đúng: PASS.
- Dòng tiến độ đúng dự án.
- `Chờ` nằm đúng trên dòng tiến độ, không nhảy lên góc phải.
- Đồng bộ ảnh: PASS.
- Sửa nhân sự cho ảnh chờ cũ: PASS.
- Xóa ảnh chờ khi QR/token không hợp lệ: PASS.
- Xóa ảnh chờ khi không tìm thấy mã đồng hồ: PASS.
- Camera/QR/chụp ảnh giữ nguyên chuỗi PASS hiện tại.

## Quy tắc cho phần tiếp theo

Từ checkpoint này, các phần DỰ ÁN / QUẢN LÝ / báo cáo / xem chỉ số / tải file phải được phát triển tách khỏi nhóm file khóa ở trên. Nếu có xung đột, ưu tiên giữ nguyên hành vi của Truy cập App + CHỤP SỐ và rollback theo SHA trong manifest này.
