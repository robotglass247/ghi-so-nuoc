# STABLE CHECKPOINT – FAST6 SPEED3 TURBO

**Ngày xác nhận:** 2026-09-11

**Trạng thái:** STABLE – người dùng đã test thực tế và xác nhận bằng màn hình kết quả.

## Benchmark thực tế
- Ảnh: **22**
- Wave: **3**
- Batch: **5**
- Tổng thời gian: **55,5 giây**
- Trung bình: **2,52 giây/ảnh**
- Thông lượng: **23,8 ảnh/phút**
- `Chờ = 0`
- Trang báo `TURBO ĐÃ GỬI HẾT`.
- `NHAT_KY_DONG_BO` đối chiếu có đủ **22 Client ID mới** của lượt test.

## So sánh SPEED2
- SPEED2 Stable: **5,60 giây/ảnh**.
- SPEED3 Stable: **2,52 giây/ảnh**.
- Nhanh hơn khoảng **2,22 lần**.
- Thời gian/ảnh giảm khoảng **55%**.

## Backend Stable
- File: `Ma.gs_FAST6_SYNC_SPEED3_TURBO_FULL.txt`
- SHA256: `e5662591da3867fe4102f608fd0a955d760e5ea2bdf6160a1756a53b04aca564`
- Backup Drive Stable ID: `1DXzq6GoO4BCyoav_y9WF-OTGJlPd0Ykn`
- API TURBO: `api=batchuploadturbo`
- SPEED2 `api=batchupload` vẫn giữ làm fallback.
- Upload đơn FAST6 vẫn giữ nguyên.

## Kiến trúc đã PASS
- Client chạy **2 request song song × tối đa 5 ảnh**.
- Backend tạo file Drive ngoài `ScriptLock`.
- `ScriptLock` chỉ giữ ở bước đối chiếu Client ID và ghi `HANG_DOI_ANH_V87` / `NHAT_KY_DONG_BO` cuối.
- Client ID vẫn là khóa chống trùng.
- Ảnh chưa ACK không bị xóa khỏi IndexedDB.

## Trang test/benchmark
`https://robotglass247.github.io/ghi-so-nuoc/speed3-turbo-test.html`

## Rollback
- Rollback gần nhất: SPEED2 Stable.
- Backend SPEED2: `Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`
- SHA256 SPEED2: `b6d77899d8a9ae372d7609cfc3c18eb91871b3e910e5a4db8e4b5f3d9f1296c7`
- Drive ID SPEED2 Stable: `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`
- Rollback sâu hơn: SPEED1 Stable – Drive ID `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.

## Quy tắc tiếp theo
Không sửa trực tiếp SPEED3 Stable. Nếu thử 3-lane/SPEED4, phải tạo PENDING riêng và chỉ nâng Stable sau test 20+ ảnh, `Chờ = 0`, đủ log, không lỗi/treo và benchmark tốt hơn 2,52 giây/ảnh.
