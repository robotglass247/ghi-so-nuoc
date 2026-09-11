# CHECKPOINT – FAST6 SPEED2 BATCH

**Ngày cập nhật:** 2026-09-11

**Trạng thái hiện tại:** PENDING RE-TEST – mốc Stable trước đó được rút lại sau khi có bằng chứng kỹ thuật cho thấy lượt >20 ảnh không đi qua kênh Batch.

## Lý do rút trạng thái Stable
Người dùng đã xác nhận hơn 20 ảnh đồng bộ hết, `Chờ = 0`, không lỗi, không treo. Tuy nhiên khi đối chiếu `NHAT_KY_DONG_BO` với Drive, một File ID của lượt này có tên:

`D2-102_20260911_220015.jpg`

Trong khi hàm SPEED2 Batch `waterBatchFileName_()` bắt buộc tạo tên dạng:

`WATER_<ClientID>.jpg`

=> Lượt >20 ảnh vừa rồi đã được FAST6/uploader đơn cũ tự đồng bộ khi Online; chưa chứng minh `api=batchupload` đã xử lý hàng lớn thực tế.

## Benchmark đã đo
Đo 22 ảnh liên tục từ `22:00:18` đến `22:03:34`: tổng 196 giây cho 21 khoảng, trung bình khoảng **9,33 giây/ảnh**.

Đây là baseline uploader đơn, KHÔNG được dùng làm benchmark SPEED2 Batch.

## Candidate SPEED2 giữ nguyên để test lại
- Backend: `Ma.gs_FAST6_SYNC_SPEED2_BATCH_FULL.txt`
- SHA256: `b6d77899d8a9ae372d7609cfc3c18eb91871b3e910e5a4db8e4b5f3d9f1296c7`
- Backup Drive candidate ID: `137wzLhy7FdXTHd-5XYF4MGROoN_LEAie`
- Bản copy từng được gắn Stable ID: `1BF0qcj9wKZsPgkxfVQu0e12Z7UtjOF6Z`; giữ lại làm snapshot lịch sử, không coi là latest stable.
- Trang test riêng: `https://robotglass247.github.io/ghi-so-nuoc/speed2-batch-test.html`
- API: `api=batchupload`
- Tối đa 5 ảnh/request.

## Cách test lại bắt buộc
1. Chụp 20–30 ảnh khi Offline.
2. Khi vẫn Offline, đóng hoàn toàn tab/trang FAST6 để nó không tự đồng bộ.
3. Bật mạng.
4. Chỉ mở `speed2-batch-test.html`.
5. Bấm chạy Batch và ghi tổng thời gian/giây ảnh hiển thị trên trang.
6. Kiểm tra ít nhất 3 File ID mới trên Drive phải có tên `WATER_<ClientID>.jpg`.
7. `Chờ = 0`, không lỗi, không mất/trùng Client ID.

## Stable hiện hành / rollback
- Latest Stable: `STABLE-2026-09-11-FAST6-SPEED1`.
- Backend rollback: `STABLE_2026-09-11_Ma.gs_FAST6_SYNC_SPEED1_FULL.txt`.
- Drive File ID SPEED1: `1f60B1tbR4l6bg4Nh4HWnXT_x6igYJzCu`.

## Quy tắc tiếp theo
Không tăng Batch 5 lên 10/20 trước khi có benchmark cô lập SPEED2 thật. Nếu muốn SPEED3 Turbo, phải tạo PENDING riêng và so sánh trực tiếp với benchmark SPEED2 cô lập.
