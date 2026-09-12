# MASTER PASS REGISTRY – GHI SỐ NƯỚC

**Ngày tạo:** 2026-09-12

## MỤC ĐÍCH
Đây là nguồn chuẩn duy nhất để biết phần nào đã PASS, phần nào chỉ là PENDING/TEST. Khi sửa, phải lấy đúng file/commit/checkpoint đã ghi ở đây; không suy đoán từ tên file, không ghép lại từ trí nhớ, không gọi PENDING là Stable.

## QUY TẮC BẮT BUỘC
1. Chỉ khi người dùng trực tiếp xác nhận PASS mới được ghi vào mục PASS.
2. Mỗi mốc PASS phải ghi: phạm vi, kết quả test, file/commit chuẩn, phần cấm sửa ngoài phạm vi.
3. Phần nào chưa PASS phải để PENDING, không được dùng làm nguồn Stable.
4. Khi sửa 1 module, giữ nguyên các module PASS khác.
5. Sau mỗi lần người dùng báo PASS, cập nhật file registry này ngay trong cùng lượt làm việc.

---

# A. LÕI CHỤP / OFFLINE / LƯU / ĐỒNG BỘ – PASS & LOCKED

## Trạng thái
**PASS – LOCKED**

## Xác nhận thực tế
- Online: chụp/lưu/đồng bộ PASS.
- Offline: chụp/lưu PASS.
- Khi có mạng lại: tự đồng bộ PASS.
- App chính: test 10 ảnh, tự đồng bộ, `Chờ = 0`.
- SPEED3 TURBO benchmark: 20 ảnh / 37.3 giây = 1.87 giây/ảnh, `Chờ = 0`.

## Mốc kỹ thuật
- Production IndexedDB: `water_meter_v6`.
- Core đang dùng SPEED3 Turbo.
- Giữ nguyên camera, QR, IndexedDB, `captureAndSave`, `dbPut`, Offline, hàng Chờ, logic xóa chỉ sau ACK, SPEED3 sync.

## Mốc repo liên quan
- SPEED3 benchmark PASS commit: `7ba3c6132d30bf797f92c7b03e09ef0e09808981`.
- SPEED3 main promotion: `e94e2f53a241869e91f284b80344e16fcbeb39ad` / publish `e2cae1d8c56246e347fb4f84e13aa9e54f39aac2`.
- Checkpoint core main PASS đã được tạo trước đó: `STABLE-2026-09-12-CORE-SPEED3-MAIN-PASS`.

## CẤM SỬA KHI LÀM MODULE KHÁC
Không sửa camera / QR / `water_meter_v6` / lưu ảnh / Offline / hàng Chờ / SPEED3 trừ khi người dùng yêu cầu sửa chính module này.

---

# B. GIAO DIỆN NHÂN SỰ MAIN905 – PASS & LOCKED

## Trạng thái
**PASS – LOCKED**

## Xác nhận/chức năng đã chốt
- Danh sách chỉ hiện **Họ và tên**; mã nhân sự giữ nội bộ để lưu backend.
- Danh sách gọn, dòng khoảng 16px Arial, padding 5px 8px, line-height 1.15.
- Chiều ngang tự theo tên dài nhất và giới hạn theo màn hình.
- Người đang chọn: nền nhấn mạnh, chữ đậm, dấu `✓`.
- Chỉ nhân sự trạng thái chính xác `Đang làm việc` được hiển thị khi backend trả đúng dữ liệu.

## Mốc chuẩn
- Commit release MAIN905: `3b23f27e3ce2e549bbfb07346a2dcd948a455929`.
- Checkpoint khóa PASS: `763105aaf4960290b78c73acf9c1fc5b949988d7`.
- Branch khóa: `stable/staff-main905-pass-20260912`.
- File chứa phần giao diện/bridge PASS tại release: `water-ui3.js` blob `0ccf58b9ff1be0ec5faf06a3a201285d9cbac607`.
- Marker giao diện: `/* STAFF_COMPACT_MAIN905 */`.

## LƯU Ý QUAN TRỌNG
MAIN905 là mốc PASS của giao diện nhân sự. Tốc độ refresh nhanh hơn thuộc STAFF3 FAST bên dưới và KHÔNG được tự động coi là PASS nếu chưa có xác nhận người dùng.

---

# C. BACKEND STAFF2 – STABLE CHO MAIN905 + SPEED3

## Trạng thái
**STABLE BACKEND**

## File chuẩn
`STABLE_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF2_FULL.txt`

- Drive ID: `13s14v6STaLll504tfcL9ay-0DMbxYa4I`
- SHA256: `ee7ad42d06b2e409b8c0a1f80ee9338970cae11b7773779dbd2327f52ad319ef`

## Có sẵn
- `api=batchuploadturbo` – giữ SPEED3 Turbo.
- `api=uistate` – trả nhân sự + tiến độ cho UI3/MAIN905.
- Lọc nhân sự chỉ trạng thái `Đang làm việc`.

---

# D. STAFF3 FASTSTAFF – PENDING, CHƯA ĐƯỢC PHÉP GỌI PASS

## Trạng thái hiện tại theo repo
**PENDING TEST – KHÔNG PHẢI STABLE/PASS**

## Vì sao
Repo có checkpoint PENDING nhưng không tìm thấy commit/checkpoint nào ghi `STAFF3 PASS`.

## Mục tiêu của candidate
- Giảm trễ cập nhật nhân sự.
- Backend thêm POST `api=staffonly`, chỉ đọc danh sách nhân sự, không chạy tiến độ.
- Khi mở `ĐỔI NHÂN SỰ`: gọi cập nhật ngay.
- Khi modal đang mở: kiểm tra khoảng **4 giây/lần**, chỉ 1 request hoạt động tại một thời điểm.
- Vẫn chỉ hiện tên; mã giữ nội bộ.

## Mốc candidate
- Checkpoint: commit `7afd0685aa2ceb4c044f3b26527d2d8128e29de4`.
- Frontend candidate/service worker: commit `266017925b2d425b20391ebdac39293386481070`.
- Test app candidate: commit `3b964eb346dc330931c1f53dd28dd340f9de1ad6`.
- Backend candidate file: `PENDING_2026-09-12_Ma.gs_FAST6_SPEED3_STAFF3_FASTSTAFF_FULL.txt`.
- Backend SHA256: `21d6688d567c1e99e81482cce4d51462222677b3082a30aa18ba8ea8f055dcb3`.

## Điều kiện để nâng thành PASS
Chỉ sau khi người dùng test và xác nhận rõ:
1. Danh sách đúng theo Sheet.
2. Thay trạng thái nhân sự được cập nhật nhanh đúng yêu cầu.
3. Giao diện tên-only MAIN905 vẫn đúng.
4. Không ảnh hưởng Online/Offline/chụp/lưu/SPEED3/`Chờ=0`.

Sau xác nhận PASS phải lập checkpoint mới `STABLE/PASS STAFF3 FAST` và cập nhật registry này ngay.

---

# E. NGUYÊN TẮC LÀM VIỆC TỪ MỐC NÀY
- Không dùng tên gần giống để suy ra bản đúng.
- Không ghép đoạn code từ trí nhớ khi đã có file/commit PASS.
- Trước khi sửa: đọc registry này -> mở đúng checkpoint/file chuẩn -> chỉ sửa phạm vi được yêu cầu.
- Sau khi PASS: khóa bản, ghi commit/blob/hash/link test/kết quả test vào registry ngay.
