# PENDING – R12.1 DEV TÁCH RIÊNG

**Ngày triển khai:** 2026-09-14

## Nguyên tắc phiên bản
R11.34 là bản STABLE/PASS và không tiếp tục sửa để thử chức năng mới.
Mọi nâng cấp từ thời điểm này tạo thành phiên bản DEV riêng, dùng tên file/module riêng.

## Bản STABLE giữ nguyên
- URL chính: `r9-direct.html`
- Module DỰ ÁN đang dùng: `water-project-tab-r91.js`
- Blob module PASS đã khôi phục: `7f84ea91fbfa5d92000e6f0c85bb2831cb6e0dff`
- Không thay lõi CHỤP SỐ, camera, QR, IndexedDB, Offline, SPEED3, backend hay QUẢN LÝ.

## Bản DEV mới
- Loader riêng: `r121-dev.html`
- Module DỰ ÁN riêng: `water-project-tab-r121.js`
- Build module: `879-r12.1-project-module`
- DEV lấy lõi PASS R11.34 nhưng thay module DỰ ÁN trong bộ nhớ khi mở; không sửa module R11.34.

## Nội dung thử nghiệm R12.1
- Thông tin dự án: tên, mã dự án, trạng thái, địa chỉ, đơn vị quản lý vận hành, người phụ trách.
- Ảnh dự án từ nguồn hiện có.
- Lịch ghi số: ngày bắt đầu, ngày kết thúc, hạn ghi.
- Tổng quan kỳ ghi: kỳ ghi, tổng, đã chụp, chưa chụp và % tiến độ.
- Ghi chú dự án nếu có.

## Tiêu chí PASS
1. `r9-direct.html` vẫn vận hành đúng như R11.34 trước nâng cấp.
2. `r121-dev.html` mở độc lập và hiển thị module DỰ ÁN R12.1.
3. Tab CHỤP SỐ của R12.1 vẫn mở camera, nhận QR, chụp/lưu/đồng bộ như lõi PASS.
4. Tab QUẢN LÝ không thay đổi ngoài các nâng cấp được tách module riêng sau này.
5. Chỉ khi người dùng xác nhận PASS mới tạo R12.1 STABLE; không ghi đè R11.34.

## Quy tắc cho các lần sau
`STABLE hiện tại -> COPY thành DEV mới -> sửa DEV -> TEST -> PASS -> tạo STABLE mới`.
Không sửa trực tiếp file/module đang được STABLE sử dụng.
