# APP GHI CHỈ SỐ NƯỚC V20 — MOBILE UI PASS

Checkpoint chốt giao diện điện thoại ngày 03/10/2026.

## Trạng thái
- Mobile UI: PASS / LOCKED
- Không thay đổi bố cục, kích thước, màu sắc hoặc vị trí tab nếu không có yêu cầu mới.
- Các thay đổi tiếp theo chỉ xử lý chức năng phía trong và phải giữ nguyên giao diện checkpoint này.

## Giao diện đã chốt
- Thanh tab trên: DỰ ÁN | CHỤP SỐ | QUẢN LÝ
- Tab QUẢN LÝ hiển thị các khối: QUẢN LÝ, LỊCH GHI SỐ, TỔNG QUAN KỲ GHI HIỆN TẠI, DỮ LIỆU GHI CHỈ SỐ, GHI CHÚ.
- Khối DỮ LIỆU GHI CHỈ SỐ dùng bố cục 2x2:
  - Chọn Tháng | TRANG QUẢN LÝ
  - TẢI FILE | XEM CHỈ SỐ
- TRANG QUẢN LÝ: Quản lý/BQL/Admin/Quản trị được dùng; Nhân viên hiển thị mờ và bị khóa.
- Trang quản lý dùng lại session đăng nhập của Ứng dụng Ghi Số.

## File nguồn được khóa theo blob SHA
- `r1135-v20-direct.html`
  - RELEASE: `20261003-manager-tab-v2`
  - blob SHA: `ec58a47465ee31fd5b3ecc66f48f39da3cf9fcaf`
- `water-manager-tab-v2.js`
  - BUILD: `water-manager-tab-v2-fixed-2x2-sso`
  - blob SHA: `873a5e67fd65a594428fc9ac71ab83eaa8c119fd`

## Link test ERP
`https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html?project=ERP&v=20261003-manager-tab-v2`

Ảnh xác nhận giao diện PASS được lưu trong hội thoại dự án ngày 03/10/2026.
