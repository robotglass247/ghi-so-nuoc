# Hancorp Plaza — bản sao V20

Địa chỉ: 72 Trần Đăng Ninh, phường Nghĩa Đô, Hà Nội.

Trạng thái: **đang thiết lập, chưa dùng để ghi số**. Các trang HTML hiện chỉ hiển thị thông báo chờ và không tải ứng dụng. Chưa triển khai Apps Script mới, chưa xác minh tài khoản sở hữu bản sao Sheet, và dữ liệu của dự án mẫu chưa được làm sạch.

## Kích hoạt

1. Hoàn tất Apps Script riêng cho Hancorp và triển khai Web app. Xác minh nó đọc/ghi đúng bản sao Sheet, thư mục ảnh riêng và thông tin Hancorp; chuẩn bị danh mục đồng hồ, chỉ số đầu và nhân sự thực tế. Không tái sử dụng deployment của dự án cũ.
2. Điền URL `/exec` mới vào `backend_url` trong `project.json`. Chỉ đặt `ready` thành `true` sau khi hoàn tất bước 1.
3. Từ thư mục gốc kho mã, chạy `python tools/build_hancorp.py` và `python tools/check_hancorp.py`. Kiểm tra chụp ảnh, đồng bộ, xác nhận, xuất file và chế độ ngoại tuyến trên điện thoại trước khi đưa vào sử dụng.
4. Commit các thay đổi và xuất bản bằng quy trình GitHub Pages của kho. Đường dẫn dự kiến sau khi xuất bản: `/ghi-so-nuoc/hancorp/`.

Bộ dựng lấy các module từ V20 ở thư mục gốc, thay Sheet và mọi URL Apps Script, kể cả JavaScript mã hóa base64 trong loader. Dữ liệu trình duyệt và IndexedDB dùng tiền tố `waterops_hancorp_v20::`; cache Service Worker dùng `water-hancorp-v20-offline-`. Danh sách nhân sự dự phòng của dự án mẫu được bỏ. Chưa bảo đảm tải lại toàn bộ giao diện V20 khi mất mạng vì kế thừa cơ chế ngoại tuyến của nguồn.

Không sửa các file sinh tự động trong thư mục này; sửa cấu hình hoặc bộ dựng rồi chạy lại. Không đặt API key, mật khẩu hay token vào kho mã công khai.
