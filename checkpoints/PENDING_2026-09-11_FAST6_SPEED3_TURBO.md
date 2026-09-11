# PENDING CHECKPOINT – FAST6 SPEED3 TURBO

**Ngày tạo:** 2026-09-11

**Trạng thái:** PENDING TEST – không thay thế SPEED2 Stable.

## Baseline Stable để so sánh
- SPEED2 Batch Stable.
- Benchmark thực tế: **15 ảnh / 3 batch / 84,0 giây / 5,60 giây/ảnh**.
- `Chờ = 0`, không lỗi, không treo.

## Mục tiêu SPEED3
Tăng tốc bằng **2 lane song song**, mỗi lane tối đa 5 ảnh/request.

Mục tiêu test vòng 1:
- khoảng **2,8–3,5 giây/ảnh** hoặc nhanh hơn;
- không mất ảnh;
- không trùng Client ID;
- `Chờ = 0`;
- không treo/timeout.

Nếu vòng 1 PASS ổn định, mới cân nhắc SPEED4/3-lane để hướng tới khoảng 2 giây/ảnh.

## Backend candidate
- File: `Ma.gs_FAST6_SYNC_SPEED3_TURBO_FULL.txt`
- SHA256: `e5662591da3867fe4102f608fd0a955d760e5ea2bdf6160a1756a53b04aca564`
- Backup Drive PENDING ID: `1_G5YeddqxDsgR8iNav2BnH7byev8KE5w`
- API mới: `api=batchuploadturbo`
- SPEED2 `api=batchupload` giữ nguyên.
- Upload đơn FAST6 giữ nguyên.

## Kiến trúc SPEED3
- Client chạy **2 request song song × tối đa 5 ảnh**.
- Mỗi request vẫn giới hạn 5 ảnh để tránh payload quá lớn.
- Backend đọc/xác thực và tạo file Drive **ngoài ScriptLock**.
- Chỉ dùng ScriptLock ở bước đối chiếu Client ID + ghi `HANG_DOI_ANH_V87` / `NHAT_KY_DONG_BO` cuối.
- Trước khi ghi, backend đọc lại Client ID dưới lock để chống race giữa hai lane.
- File ảnh vẫn đặt theo Client ID để retry không nhân bản dữ liệu.
- Nếu 1 lane lỗi, lane còn lại có thể ACK độc lập; ảnh chưa ACK giữ nguyên trong IndexedDB.

## Trang test riêng
- `https://robotglass247.github.io/ghi-so-nuoc/speed3-turbo-test.html`
- Commit tạo trang: `b0bdc7a97258b218abb1ce41926df99b8a9f5db7`
- Không đăng ký Service Worker mới.
- Không sửa camera/QR/Offline/FAST6/SPEED2 Stable.

## Cách test bắt buộc
1. Deploy backend SPEED3 candidate vào cùng deployment AH bằng New version.
2. Chụp ít nhất 15–20 ảnh khi Offline.
3. Khi vẫn Offline, đóng hoàn toàn FAST6 để tránh uploader Stable tự chạy.
4. Bật mạng.
5. Chỉ mở `speed3-turbo-test.html`.
6. Bấm `ĐỒNG BỘ TURBO · 2 × 5 ẢNH`.
7. Chụp màn hình kết quả tổng thời gian + giây/ảnh.
8. Xác nhận `Chờ = 0`, không lỗi, không treo.

## Rollback
- Latest Stable: SPEED2 Batch.
- Backend rollback: `Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`.
- SHA256: `b6d77899d8a9ae372d7609cfc3c18eb91871b3e910e5a4db8e4b5f3d9f1296c7`.
- Drive Stable ID: `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`.

Không nâng SPEED3 thành Stable cho đến khi người dùng test thực tế và xác nhận PASS.
