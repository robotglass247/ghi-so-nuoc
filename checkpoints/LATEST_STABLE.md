# LATEST STABLE – GHI SỔ NƯỚC

**Cập nhật:** 2026-09-11

## Mốc Stable hiện tại
`STABLE-2026-09-11-FAST6-SPEED1`

- Checkpoint chi tiết: `checkpoints/STABLE_2026-09-11_FAST6_SPEED1.md`
- Backend: `Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`
- SHA256 backend: `fada3a63f9ac01ce48d461a5ec3e557beab385aa1db7a225d0d4f8f069c31790`
- Backup Drive Stable ID: `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`
- Trang chạy: `https://robotglass247.github.io/ghi-so-nuoc/v87-background.html`

## Xác nhận thực tế
- 10 ảnh Online/Offline đã đồng bộ hoàn tất.
- `Chờ = 0`.
- Luồng camera/QR/lưu Offline/đồng bộ đơn đã PASS thực tế.

## SPEED2 Batch
**Trạng thái:** PENDING RE-TEST – chưa được coi là Stable về Batch/tốc độ.

Lý do: lượt hơn 20 ảnh ngày 2026-09-11 được xác nhận về 0 nhưng bằng chứng Drive cho thấy ảnh đi qua uploader đơn cũ, không phải `api=batchupload`. File Drive kiểm tra có tên `D2-102_20260911_220015.jpg`, trong khi SPEED2 Batch phải tạo tên `WATER_<ClientID>.jpg`.

Benchmark thực tế của đoạn 22 ảnh liên tục 22:00:18–22:03:34 là khoảng **9,33 giây/ảnh**; đây là baseline uploader đơn, không phải benchmark SPEED2 Batch.

## Quy tắc
Mọi thay đổi mới phải tạo PENDING riêng. SPEED2/SPEED3 chỉ được nâng Stable sau khi test cô lập đúng kênh Batch và có bằng chứng File ID/tên file + thời gian thực tế.
