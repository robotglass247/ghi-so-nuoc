# CHECKPOINT V20 PACKAGE — 2026-10-04

## Trạng thái

**STABLE / PACKAGE CANDIDATE** sau test thực tế trên dự án `PKG001`.

Mục tiêu của checkpoint này là chốt các phần đã PASS trước khi nhân bản dự án thương mại tiếp theo, đồng thời loại các module thử nghiệm `AI kick` khỏi luồng chính.

## Các phần đã PASS thực tế

### 1. Nhân bản dự án
- `PKG001` được tạo từ luồng `TAO_DU_AN`.
- Sheet dự án, folder dự án và folder ảnh tách riêng theo `PROJECT_ID`.
- Ảnh chụp đi đúng vào folder của `PKG001`.
- Dữ liệu Sheet đồng bộ lên ứng dụng.

### 2. Auth / Quản lý nhân sự
- Manager nhìn thấy tab `QUẢN LÝ NHÂN SỰ`; nhân viên không nhìn thấy.
- Danh sách nhân sự đọc được từ `NHAN_SU_THUC_HIEN`.
- Backend quản lý nhân sự hoạt động với session token.
- Package finalizer R2 tự tạo tài khoản quản lý đầu tiên bằng mật khẩu hash, không lưu mật khẩu rõ.

### 3. PWA riêng theo dự án
- `install.html?project=<PROJECT_ID>` dùng manifest động theo `PROJECT_ID`.
- `sw-pwa.js` sinh `manifest-project.webmanifest` theo query project.
- Manifest có `id` và `start_url` chứa `PROJECT_ID`, tránh dùng chung một identity cho mọi dự án.

### 4. AI FAST + fallback
- Benchmark `PKG001`: 2 ảnh chạy song song bằng `gemini-3.5-flash-lite` khoảng 1.7 giây và khớp 2/2 kết quả đang lưu.
- Replay ảnh khó: FAST và fallback cùng đọc đúng `578`.
- Quy tắc đọc/validation V8.7.3 được giữ nguyên.
- Khi FAST không chắc chắn, hệ thống không tự đoán mà chuyển fallback.

### 5. AI xử lý ngay sau upload
- Ảnh test cuối `P40319` lúc 10:34:30 ngày 04/10/2026:
  - Đã đồng bộ.
  - Đã xử lý AI.
  - Đọc `142 m3`.
  - Confidence `0.98`.
  - Số lần AI `1`.
- Trigger dự phòng chạy sau đó; ảnh đã được xử lý trước lượt trigger dự phòng gần nhất.
- Kết luận: luồng `upload -> AI inline -> ghi kết quả` PASS.

## Kiến trúc AI production sau cleanup

### Luồng chính
`SPEED3/TURBO upload` -> ghi `HANG_DOI_ANH_V87` -> `waterAIInlineAfterTurboV20_()` -> FAST -> fallback nếu cần -> `waterFinishV87Project_()`.

### Luồng dự phòng
Trigger mỗi 1 phút: `XU_LY_HANG_DOI_AI_MULTI_FAST`.

Trigger chỉ là dự phòng khi inline không xử lý được hoặc gặp lỗi tạm thời.

## File production chính

### Frontend
- `r1135-v20-direct.html`
  - Release: `20261004-ai-inline-package-v20`.
  - Không còn nạp `water-ai-immediate-kick-v1.js`.
- `install.html`
- `sw-pwa.js`
- `pwa-start.html`
- các module Auth / Manager UI đã PASS.

### Apps Script
- `20_Project_Provisioning_V20.gs`
- `21_Auth_Login_V20_R2.gs` — **AUTH authoritative**.
- `22_Auto_Staff_Code_V20.gs`
- `23_API_Session_Guard_V20.gs`
- `25_BQL_Actions_V20.gs`
- `26_Staff_Admin_V20.gs`
- `27_Project_Package_Finalize_V20.gs`
- `30_AI_Fast_Production_V20.gs`
- `32_AI_Inline_After_Upload_V20.gs`

Ngoài ra giữ các file core/router hiện đang chạy trong Apps Script: `Mã.gs`, `00_Project_Router.gs`, `10_Backend_Core.gs`, `12_Project_Danh_Muc.gs`, `13_Xac_Nhan_Kiem_Tra...`.

## Cleanup đã thực hiện trên GitHub

- Xóa frontend thử nghiệm `water-ai-immediate-kick-v1.js`.
- Xóa backend staged `31_AI_Immediate_Kick_V20.gs`.
- Xóa auth legacy `21_Auth_Login_V20.gs`; giữ `21_Auth_Login_V20_R2.gs` làm nguồn chuẩn.
- `32_AI_Inline_After_Upload_V20.gs` đã chuyển từ chỉ `PKG001` sang **mọi PROJECT_ID**, dùng FAST trực tiếp và fallback, không còn phụ thuộc module 31.

## Việc cần đồng bộ một lần trong Apps Script live trước khi test clone cuối

1. Thay nội dung file live `32_AI_Inline_After_Upload_V20.gs` bằng bản GitHub hiện tại.
2. Trong `10_Backend_Core.gs`, giữ đoạn gọi inline sau `nhanLoAnhTurbo_()`:

```javascript
if (
  typeof waterAIInlineAfterTurboV20_ === 'function'
) {
  waterAIInlineAfterTurboV20_(
    turboProjectId,
    result
  );
}
```

3. Xóa route thử nghiệm `api === 'aikick'` trong `doPost`.
4. Có thể xóa các file test/staged khỏi Apps Script live sau khi precheck PASS:
   - `28_AI_Fast_Test_V20.gs`
   - `29_AI_Fast_Fallback_Replay_V20.gs`
   - `31_AI_Immediate_Kick_V20.gs`
5. Chạy `KIEM_TRA_AI_INLINE_AFTER_UPLOAD_V20()` — phải `ok:true`.
6. Deploy **phiên bản mới** trên deployment hiện tại, không đổi URL Web App.

## Emergency rollback

- Tắt AI inline mà không cần sửa code:
  - chạy `TAT_AI_INLINE_V20()`.
- Bật lại:
  - chạy `BAT_AI_INLINE_V20()`.
- Khi inline tắt, trigger 1 phút tiếp tục là tuyến xử lý AI dự phòng.

## Tiêu chí clone cuối trước khi đóng gói chính thức

Tạo một dự án mới (ví dụ `PKG002`) và xác nhận:
- Registry `READY`.
- Tự có tài khoản manager hash.
- `PWA_INSTALL_URL`, `SECURITY_STATUS`, `BQL_URL` được ghi.
- Đăng nhập manager được.
- Tab Quản lý nhân sự đúng phân quyền.
- Thêm ít nhất 1 đồng hồ.
- Chụp 1 ảnh.
- Ảnh vào đúng folder của `PKG002`.
- AI xử lý inline không cần chờ trigger 1 phút.
- Quản lý hiển thị đúng chỉ số/ảnh.
- Không rò dữ liệu sang `PKG001`/ERP.

Chỉ sau khi các mục trên PASS mới đổi trạng thái từ **PACKAGE CANDIDATE** sang **PACKAGE RELEASE**.
