# GHI SỐ NƯỚC – VERSION REGISTRY

## Quy tắc bắt buộc
1. Không sửa trực tiếp phiên bản STABLE/PASS đang chạy.
2. Trước mỗi đợt nâng cấp: sao lưu bản PASS gần nhất lên Google Drive.
3. Tạo loader/module mang tên phiên bản DEV mới.
4. Chỉ sửa file DEV.
5. Người dùng test thực tế và xác nhận PASS.
6. Sau PASS mới tạo STABLE mới; STABLE cũ vẫn giữ để rollback.

## R11.34 – STABLE / PASS
- Trạng thái: STABLE, không nâng cấp trực tiếp.
- Loader: `r9-direct.html`
- Module DỰ ÁN: `water-project-tab-r91.js`
- SHA module DỰ ÁN PASS: `7f84ea91fbfa5d92000e6f0c85bb2831cb6e0dff`
- Backup Drive: `APP_GHI_SO_NUOC_PASS_R11.34_2026-09-14`

## R12.1 – DEV / PENDING
- Trạng thái: DEV, tách riêng để phát triển và thử nghiệm.
- Loader: `r121-dev.html`
- Module DỰ ÁN: `water-project-tab-r121.js`
- Build module: `879-r12.1-project-module`
- Nguyên tắc: không sửa `r9-direct.html` hoặc các module STABLE của R11.34.
- Khi cần nâng CHỤP SỐ/OCR/camera: tạo module R12.1 riêng trước rồi mới sửa.

## Luồng phiên bản
`R11.34 STABLE -> COPY -> R12.1 DEV -> TEST -> PASS -> R12.1 STABLE -> COPY -> R12.2 DEV`
