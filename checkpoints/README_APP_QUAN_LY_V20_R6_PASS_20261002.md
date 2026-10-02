# CHECKPOINT PASS — APP QUẢN LÝ GHI CHỈ SỐ NƯỚC V20 R6

Ngày khóa mốc: 02/10/2026

## Trạng thái
- App Quản lý V20 R6: PASS tại mốc này.
- Frontend chính của checkpoint: `quan-ly-v20-r6.html`.
- PROJECT test: `ERP` — Chung cư Eurowindow River Park.
- URL test: `https://robotglass247.github.io/ghi-so-nuoc/quan-ly-v20-r6.html?project=ERP`

## Các chức năng đã PASS
- Đăng nhập/phân quyền quản lý.
- Tổng quan dự án.
- Lọc theo Kỳ / Tòa / Tầng / Căn hộ / Mã đồng hồ / Trạng thái.
- Kiểm tra & đối chiếu chỉ số.
- Xem ảnh đồng hồ.
- Xác nhận chỉ số đúng / yêu cầu chụp lại / chỉnh sửa chỉ số.
- Người xác thực hiển thị cuối dòng.
- Tải Excel kỳ đang chọn theo mẫu Ứng dụng Ghi Chỉ Số.
- Tốc độ tải BQL đã tối ưu bước tìm dòng cuối.
- `Đang chờ` dùng đúng tiêu chí Ứng dụng Ghi Chỉ Số: chỉ đếm `CHỜ AI` hoặc `ĐANG AI`.
- Cơ chế ảnh thay thế: cùng Kỳ + Mã đồng hồ, ảnh hợp lệ mới nhất được promote thành bản chính; ảnh cũ chờ dọn.
- ERP đã kiểm tra thực tế P40202 = 1193 và P40309 = 578 sau chụp thay thế.

## Nguyên tắc khóa
Không sửa lan sang App Quản lý R6 khi thực hiện bước tiếp theo. Mọi thay đổi mới nên làm ở file/version mới hoặc nhánh riêng, chỉ nhập lại R6 sau khi test PASS.

## Hạng mục chưa coi là production-hardening
- Ảnh trên BQL hiện vẫn dùng đường dẫn Drive trực tiếp sau đăng nhập; cần secure image proxy trước khi phát hành rộng cho khách hàng ngoài hệ thống.
- Có thể tiếp tục hoàn thiện period close/reopen và các kiểm soát Admin ở bước sau.

## Mốc GitHub
Checkpoint được lập từ trạng thái `main` sau commit `c5dc2d5c0be5a4aa5aa368b54b90014931a42951`.
