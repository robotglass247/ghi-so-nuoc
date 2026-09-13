# MASTER PASS REGISTRY – GHI SỐ NƯỚC

**Ngày tạo:** 2026-09-12  
**Cập nhật PASS mới nhất:** 2026-09-13

## MỤC ĐÍCH
Đây là nguồn chuẩn duy nhất để biết phần nào đã PASS, phần nào chỉ là PENDING/TEST. Khi sửa, phải lấy đúng file/commit/checkpoint đã ghi ở đây; không suy đoán từ tên file, không ghép lại từ trí nhớ, không gọi PENDING là Stable.

## QUY TẮC BẮT BUỘC
1. Chỉ khi người dùng trực tiếp xác nhận PASS mới được ghi vào mục PASS.
2. Mỗi mốc PASS phải ghi: phạm vi, kết quả test, file/commit/checkpoint chuẩn, phần cấm sửa ngoài phạm vi.
3. Phần nào chưa PASS phải để PENDING, không được dùng làm nguồn Stable.
4. Khi sửa 1 module, giữ nguyên các module PASS khác.
5. Sau mỗi lần người dùng báo PASS, cập nhật file registry này ngay trong cùng lượt làm việc.

---

# MỐC PHỤC HỒI HIỆN TẠI – FINAL2 SAFE PASS & LOCKED

## Trạng thái
**PASS – LOCKED – ƯU TIÊN PHỤC HỒI SỐ 1**

## Xác nhận trực tiếp ngày 2026-09-13
Người dùng test và xác nhận:
- **Nhân sự: OK**
- **Chụp → Lưu → Chờ → Đồng bộ: OK**
- Hàng `Chờ` tự về `0` sau đồng bộ.

## Link updater chuẩn hiện tại
`https://robotglass247.github.io/ghi-so-nuoc/update-final2-safe.html`

## Build
`879-final2-safe`

## Checkpoint chuẩn
`checkpoints/STABLE_2026-09-13_FINAL2_SAFE_PASS.md`

Checkpoint commit: `3833be5f49ec937231642ed4a21fe035ae735b64`

## File/commit/blob chuẩn
- `update-final2-safe.html`
  - commit `f19ea45fa13c7f2e9fe66ccdab80f38df81b6f30`
  - blob `87ca328c548b372fa3f8c6ef2a89fa7188565bdd`
- `water-offline-sw-final2-safe.js`
  - commit `df8cb7d9b4dd59e8da2f48d23cd6229439c9d89f`
  - blob `327536547bde555ea1dd89c1d51faa2998beea48`
- `water-final-core-pre.js`
  - commit `d721428b854bd682747d70f741dba83192fad161`
  - blob `0ca1c810cdf3062af21cd26a805785ce7a4ac771`
- `water-final-core-post.js`
  - commit `28c98454bdc84484c3ff1dfe214a4cb5c83f54d5`
  - blob `e4f5ea0a08e3b8935dad074fb38efec89d3d04cd`
- `water-ui3.js` MAIN905 PASS blob `0ccf58b9ff1be0ec5faf06a3a201285d9cbac607`
- `water-shot-guide.js` blob `813ab39b9fa1357036c052dd4105b48ddd6e0057`

## Kiến trúc bắt buộc đã PASS
Thứ tự nạp phải giữ nguyên:
`water-final-core-pre.js` → `water-ui3.js` → `water-final-core-post.js` → `water-shot-guide.js`.

Mục đích: UI3 vẫn cung cấp Nhân sự/tiến độ nhưng không được giữ quyền ghi đè `setStatus` và `acceptLiveQR` của lõi camera/QR.

## CẤM SỬA KHI LÀM MODULE KHÁC
Không sửa camera, QR, `captureAndSave`, `dbPut`, `water_meter_v6`, hàng Chờ, Offline/local-first, SPEED3 Turbo, logic xóa queue sau ACK, Nhân sự MAIN905, hoặc thứ tự `pre → UI3 → post → guide`, trừ khi người dùng yêu cầu sửa chính module đó.

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
- Ngày 2026-09-13: FINAL2 SAFE tiếp tục PASS chuỗi Chụp → Lưu → Chờ → Đồng bộ → `Chờ = 0`.

## Mốc kỹ thuật
- Production IndexedDB: `water_meter_v6`.
- Core đang dùng SPEED3 Turbo.
- Giữ nguyên camera, QR, IndexedDB, `captureAndSave`, `dbPut`, Offline, hàng Chờ, logic xóa chỉ sau ACK, SPEED3 sync.

## Mốc repo liên quan
- SPEED3 benchmark PASS commit: `7ba3c6132d30bf797f92c7b03e09ef0e09808981`.
- SPEED3 main promotion: `e94e2f53a241869e91f284b80344e16fcbeb39ad` / publish `e2cae1d8c56246e347fb4f84e13aa9e54f39aac2`.
- Checkpoint core main PASS đã được tạo trước đó: `STABLE-2026-09-12-CORE-SPEED3-MAIN-PASS`.
- Mốc phục hồi tích hợp mới nhất: `checkpoints/STABLE_2026-09-13_FINAL2_SAFE_PASS.md`.

## CẤM SỬA KHI LÀM MODULE KHÁC
Không sửa camera / QR / `water_meter_v6` / lưu ảnh / Offline / hàng Chờ / SPEED3 trừ khi người dùng yêu cầu sửa chính module này.

---

# B. GIAO DIỆN NHÂN SỰ MAIN905 – PASS & LOCKED

## Trạng thái
**PASS – LOCKED**

## MỐC MAIN905 GỐC
Ngày 2026-09-12 người dùng chốt link sau là mốc chuẩn phần Nhân sự:
`https://robotglass247.github.io/ghi-so-nuoc/update-main905.html?utm_source=chatgpt.com`

Quy ước:
- Khi cần phục hồi riêng phần Nhân sự MAIN905 gốc, dùng updater này.
- Không thay bằng STAFF3 FAST hoặc candidate PENDING.
- Phần query `?utm_source=chatgpt.com` không thay đổi nội dung file updater; file kỹ thuật gốc vẫn là `update-main905.html`.

## Mốc tích hợp mới nhất
Ngày 2026-09-13, Nhân sự MAIN905 trong **FINAL2 SAFE** được người dùng test và xác nhận **OK**. Vì vậy khi phục hồi toàn bộ app, ưu tiên mốc FINAL2 SAFE ở đầu registry.

## Xác nhận/chức năng đã chốt
- Danh sách chỉ hiện **Họ và tên**; mã nhân sự giữ nội bộ để lưu backend.
- Danh sách gọn, dòng khoảng 16px Arial, padding 5px 8px, line-height 1.15.
- Chiều ngang tự theo tên dài nhất và giới hạn theo màn hình.
- Người đang chọn: nền nhấn mạnh, chữ đậm, dấu `✓`.
- Chỉ nhân sự trạng thái chính xác `Đang làm việc` được hiển thị khi backend trả đúng dữ liệu.

## Mốc chuẩn MAIN905
- Commit release MAIN905: `3b23f27e3ce2e549bbfb07346a2dcd948a455929`.
- Checkpoint khóa PASS: `763105aaf4960290b78c73acf9c1fc5b949988d7`.
- Commit publish updater: `8457e4abc33cc95b5363ed55c41641bb1a2f7189`.
- Branch khóa: `stable/staff-main905-pass-20260912`.
- Updater `update-main905.html` blob: `9f16c695cde50289412d384735f4719e3b4d7b6a`.
- File chứa phần giao diện/bridge PASS: `water-ui3.js` blob `0ccf58b9ff1be0ec5faf06a3a201285d9cbac607`.
- Marker giao diện: `/* STAFF_COMPACT_MAIN905 */`.
- Build gốc: `879-main905`.

## Cơ chế cập nhật thực tế của MAIN905 PASS
- `water-ui3.js` dùng POST bridge `api=uistate`.
- Tự gọi khi startup, online lại, `pageshow`, app visible lại; có gọi bổ sung sau thao tác chụp/sync.
- Chu kỳ nền của MAIN905 là **30 giây**.
- Không được nhầm MAIN905 PASS với candidate STAFF3 FAST 4 giây.

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

# E. LỖI ĐÃ BIẾT – KHÔNG LẶP LẠI
Candidate giao diện trước FINAL2 SAFE từng có hiện tượng: ảnh **đã được `dbPut()` vào queue** nhưng lớp UI sau đó làm `captureAndSave()` rơi vào nhánh báo `CHƯA LƯU`. Khi mở lại, ảnh vẫn có trong `Chờ` và SPEED3 gửi về `0`.

Cách đã PASS: bảo vệ hàm lõi trước khi nạp UI3 và khôi phục `setStatus`/`acceptLiveQR` ngay sau UI3. Không sửa `captureAndSave`, IndexedDB hoặc SPEED3.

---

# F. NGUYÊN TẮC LÀM VIỆC TỪ MỐC NÀY
- Khi cần phục hồi toàn bộ app: dùng **FINAL2 SAFE PASS** ở đầu registry.
- Không dùng tên gần giống để suy ra bản đúng.
- Không ghép đoạn code từ trí nhớ khi đã có file/commit PASS.
- Trước khi sửa: đọc registry này → mở đúng checkpoint/file chuẩn → chỉ sửa phạm vi được yêu cầu.
- Sau khi PASS: khóa bản, ghi commit/blob/hash/link test/kết quả test vào registry ngay.

---

# G. TAB CẢNH BÁO QR VỪA XỬ LÝ LIỀN KỀ – FINAL10 R4 PASS & LOCKED

## Trạng thái
**PASS – LOCKED RIÊNG MODULE CẢNH BÁO**

## Xác nhận trực tiếp ngày 2026-09-13
Người dùng xác nhận: **“OK. Tab này Pass. Em đóng ở đây”**.

Phạm vi PASS:
- Khi QR là đúng đồng hồ vừa xử lý liền trước và nút chụp bị khóa, hiện: **HÃY CHỌN ĐỒNG HỒ KHÁC ĐỂ CHỤP**.
- Dòng phụ: **Đồng hồ này vừa chụp xong.**
- Tab cảnh báo có nền vàng cam, viền cam đậm, chữ nâu đỏ đậm; trạng thái disabled không bị mờ.
- Khi chuyển sang mã đồng hồ khác, cảnh báo được bỏ và luồng chụp tiếp tục bình thường.

## Link updater PASS
`https://robotglass247.github.io/ghi-so-nuoc/update-final10-postcapture-r4.html`

## Build
`879-final10-postcapture-r4`

## Checkpoint chuẩn
`checkpoints/STABLE_2026-09-13_FINAL10_R4_WARNING_TAB_PASS.md`

Checkpoint commit: `270b979db64bd69bdeea6ab9b38abad4da2272aa`

## File/commit/blob chuẩn
- `water-shot-guide-final10-postcapture-r4.js`
  - commit `09eac01f34f5cba7f8a44543dd69fb09d2fb3648`
  - blob `9b2bea94f2e1e4f649f73aa451a4789bb3b0aa33`
- `water-offline-sw-final10-postcapture-r4.js`
  - commit `5dedefa63d36dea3d737afcb12b0bd677565c001`
  - blob `681c4aa89f816226be053449f4958140a3bb677b`
- `update-final10-postcapture-r4.html`
  - commit `ad61f9b71a96c4616212b65be5fbc47a1f53f3ee`
  - blob `6567d7e040badf9972b9974fa801c622dd75e2bc`

## GitHub Pages
Run `34739520084`: **completed / success**.

## Phần lõi giữ nguyên / không được suy rộng PASS
Mốc này không thay thế mốc phục hồi lõi **FINAL2 SAFE PASS**. Khi sửa riêng tab cảnh báo, phải bắt đầu từ đúng R4 ở trên và không sửa `captureAndSave`, IndexedDB `water_meter_v6`, queue/Chờ, Offline/local-first, SPEED3, hoặc Nhân sự MAIN905 nếu không có yêu cầu riêng.
