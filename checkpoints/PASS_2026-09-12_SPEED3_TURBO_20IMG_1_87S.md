# PASS – SPEED3 TURBO 20 ảnh

**Ngày xác nhận:** 2026-09-12

Người dùng xác nhận trực tiếp trên điện thoại:
- 20 ảnh đồng bộ hết.
- Chờ = 0.
- 2 wave.
- 4 batch.
- Tổng thời gian: 37,3 giây.
- Trung bình: 1,87 giây/ảnh.
- Thông lượng: 32,1 ảnh/phút.

## Cấu hình đã PASS
- SPEED3 TURBO 2 luồng song song.
- Mỗi luồng tối đa 5 ảnh/batch.
- API backend: `batchuploadturbo`.
- Backend snapshot: `STABLE_2026-09-11_Ma.gs_FAST6_SYNC_SPEED3_TURBO_FULL.txt`.
- Drive ID backend: `1DXzq6GoO4BCyoav_y9WF-OTGJlPd0Ykn`.
- Trang test: `speed3-turbo-test.html`.
- IndexedDB dùng chung: `water_meter_v6`, store `queue`.

## Quy tắc tiếp theo
1. Giữ nguyên lõi camera, QR, Offline, lưu IndexedDB đã PASS.
2. Chỉ ghép cơ chế đồng bộ SPEED3 vào bản app test riêng.
3. Chỉ khi app test PASS Online/Offline + lưu + tự đồng bộ + Chờ=0 mới đưa vào app chính.
4. Sau khi SPEED3 app chính PASS mới ghép phần Nhân sự đã PASS.
