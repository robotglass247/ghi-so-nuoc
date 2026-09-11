# LATEST STABLE – GHI SỔ NƯỚC

**Cập nhật:** 2026-09-11

## Mốc Stable hiện tại
`STABLE-2026-09-11-FAST6-SPEED3-TURBO`

- Checkpoint chi tiết: `checkpoints/STABLE_2026-09-11_FAST6_SPEED3_TURBO.md`
- Backend: `Ma.gs_FAST6_SYNC_SPEED3_TURBO_FULL.txt`
- SHA256 backend: `e5662591da3867fe4102f608fd0a955d760e5ea2bdf6160a1756a53b04aca564`
- Backup Drive Stable ID: `1DXzq6GoO4BCyoav_y9WF-OTGJlPd0Ykn`
- Trang TURBO Stable/test: `https://robotglass247.github.io/ghi-so-nuoc/speed3-turbo-test.html`
- Trang FAST6 lõi: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`

## Benchmark Stable
Test thực tế SPEED3 TURBO đã được người dùng xác nhận:
- **22 ảnh**
- **3 wave**
- **5 batch**
- **55,5 giây tổng**
- **2,52 giây/ảnh**
- **23,8 ảnh/phút**
- `Chờ = 0`
- Trang báo `TURBO ĐÃ GỬI HẾT`.
- `NHAT_KY_DONG_BO` đối chiếu đủ **22 Client ID mới**.

## So sánh SPEED2
- SPEED2: **5,60 giây/ảnh**.
- SPEED3: **2,52 giây/ảnh**.
- SPEED3 nhanh hơn khoảng **2,22 lần**, giảm khoảng **55% thời gian/ảnh**.

## Rollback
- Rollback gần nhất: SPEED2 Stable – Drive ID `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`.
- Rollback sâu hơn: SPEED1 Stable – Drive ID `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.

## Quy tắc
Mọi tối ưu sau mốc này phải tạo PENDING riêng. Không sửa trực tiếp SPEED3 Stable. Nếu thử 3-lane/SPEED4, chỉ nâng Stable sau khi test 20+ ảnh, `Chờ = 0`, đủ log, không lỗi/treo và benchmark tốt hơn **2,52 giây/ảnh**.
