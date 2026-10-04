# PWA PACKAGE V1 - GHI CHỈ SỐ NƯỚC

Trạng thái: ĐÓNG GÓI / DÙNG CHO NHÂN BẢN DỰ ÁN

## Link chuẩn từ PROJECT_REGISTRY

`https://robotglass247.github.io/ghi-so-nuoc/install.html?project=PROJECT_ID`

Có thể thêm tên dự án:

`https://robotglass247.github.io/ghi-so-nuoc/install.html?project=PROJECT_ID&projectName=TEN_DU_AN`

## Luồng chuẩn

1. Người dùng mở link cài đặt.
2. Nếu mở trong Zalo:
   - Android: thử chuyển sang Chrome bằng Intent; có nút MỞ BẰNG CHROME nếu cần.
   - iPhone/iPad: yêu cầu mở bằng Safari; có nút sao chép link nếu cần.
3. Ngoài Zalo: chuyển vào bộ cài Package V1.
4. Người dùng chọn MÁY TÍNH hoặc ĐIỆN THOẠI.
5. Manifest được tạo theo PROJECT_ID qua `sw-pwa.js`.
6. Mỗi PROJECT_ID có PWA ID riêng.
7. Sau khi `appinstalled`: báo `Đã cài Icon thành công` và tự chuyển vào App của đúng PROJECT_ID.
8. iPhone/iPad dùng Safari → Chia sẻ → Thêm vào Màn hình chính; icon mới mở thẳng App.

## Thành phần

- `/install.html`: gateway chuẩn dùng cho Registry và link gửi người dùng.
- `/icon-module-v2/package-v1/install.html`: chọn máy tính / điện thoại.
- `/icon-module-v2/package-v1/desktop.html`: bộ cài máy tính.
- `/icon-module-v2/package-v1/mobile.html`: bộ cài điện thoại.
- `/icon-module-v2/package-v1/start.html`: điểm khởi động PWA và chuyển vào App.
- `/sw-pwa.js`: sinh manifest riêng theo PROJECT_ID.
- `/icon-module-v2/icon-water-meter.svg`: icon chuẩn Ghi Chỉ Số Nước.

## Quy tắc nhân bản

Không tạo thêm file HTML riêng cho từng dự án. Dự án mới chỉ cần PROJECT_ID trong `PROJECT_REGISTRY`; PWA_INSTALL_URL dùng link chuẩn `/install.html?project=<PROJECT_ID>`. Bộ cài tự sinh cấu hình PWA theo PROJECT_ID.

## Bản tham chiếu đã test

PKG001 là dự án tham chiếu đã test thành công trên máy tính và điện thoại trước khi đóng gói Package V1.
