# V20 FULL SYSTEM PASS — 2026-10-01

## Scope locked
This checkpoint locks the current production state before starting automatic project cloning.

### Frontend/App
- App entry: `r1135-v20-direct.html`
- Project routing: `?project=PROJECT_ID`
- Central backend deployment: `https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec`
- GitHub main checkpoint before manifest: `77dd2d5b5b5c27603afe5ac09a81784df0602346`
- Loader blob SHA: `bd38b26057d0f179d82793cd03534957af203cc8`
- Router blob SHA: `3ceecc0d31c97cd38ea621127284da5c5cbebcaf`
- Project tab blob SHA: `9001f9ac3352c1473481626e219f647796ff7c26`
- Manage data blob SHA: `b6e8101a3c7498137e22413f3face2081de3bd8b`
- Progress authority blob SHA: `506ef7b485d719df6c72857aa11bdb42e99a77e4`

## Architecture verified
`V20 frontend -> central Apps Script -> PROJECT_ID -> PROJECT_REGISTRY -> project SHEET_ID -> project data/photo folder`

No project-specific Sheet ID is used by the active V20 management data module. `months` and `monthdata` are read through the central backend using `PROJECT_ID`.

## TEST5 reference project
- PROJECT_ID: `TEST5`
- Project sheet ID: `1aWSL6t8DcHl67YU6wCHYemOWhM4CBBRpbqp9Ujqv12M`
- Registry: `1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0`
- Current project name: `Tòa nhà Chung cư`
- PASS backup copy: `PASS_TEST5_FULL_SYSTEM_20261001`
- PASS backup copy ID: `1TFakmvTeAx_AUaRk4QN9mD50M_kfh21PbGzxf8-04Hk`

## Functional PASS checklist
### CHỤP SỐ
- Project-aware routing: PASS
- Staff from project file: PASS
- Progress by current project/current period: PASS
- Capture + sync queue: PASS
- Invalid QR/token removal from pending queue: PASS
- Meter-not-found removal from pending queue: PASS
- AI read + promote into `GHI_SO_HANG_THANG`: PASS

### DỰ ÁN
- Project information from `THONG_TIN_DU_AN`: PASS
- Dynamic by PROJECT_ID: PASS
- V20 layout: PASS
- Project image: PASS

### QUẢN LÝ
- Xem chỉ số by PROJECT_ID: PASS
- Tải file by PROJECT_ID: PASS
- `GHI_SO_HANG_THANG` -> `TAI_CHI_SO_THANG` -> management data flow: PASS
- `FILE_CHI_SO_THANG` period/filter output: PASS
- `CAN_XU_LY` current-period logic: PASS
- Checkbox `Đã kiểm tra`: PASS
- `Kết quả đối chiếu`: PASS
- Confirmation email: PASS
- Confirmation timestamp: PASS

### DANH MỤC / QR
- Meter code auto-generation: PASS
- Project-aware QR payload/token: PASS
- QR link + App link: PASS
- New meter QR auto-generation trigger: PASS

## Data state at lock
- Meter catalog: 9 meters, all with V5 PROJECT/MADH/TOKEN QR payload.
- Current period: `10/2026`.
- `GHI_SO_HANG_THANG`: 7 total records (4 in 09/2026, 3 in 10/2026).
- `FILE_CHI_SO_THANG` 10/2026: 3 rows.
- `TAI_CHI_SO_THANG`: 7 rows total.
- `CAN_XU_LY` 10/2026: 1 case (`H24403`, missing/invalid opening reading).
- Registry duplicate `TEST002` cleaned: older duplicate renamed `TEST002_OLD` and set `ARCHIVED`; active IDs are unique.
- `NHAN_SU_THUC_HIEN` project title now follows `THONG_TIN_DU_AN!B2`.

## Sheet input policy
Management workbook is intended to expose only input fields and protect automatic/system fields.
Primary input areas:
- `GHI_SO_HANG_THANG`: H, X, AB
- `CAN_XU_LY`: view only
- `FILE_CHI_SO_THANG`: C2, E2, G2, I2
- `DANH_MUC_DONG_HO`: B:D and F from row 3
- `NHAN_SU_THUC_HIEN`: A:H from row 5
- `THONG_TIN_DU_AN`: B:H, J, L:M on row 2
- Hidden technical sheets: protected/view restricted as configured in the project workbook.

## Backend requirements locked
The production central Apps Script must retain these project-aware behaviors/functions:
- project parameter normalization/routing
- `waterOpenProject_`
- `waterUiStatePost_`
- project info reader using `layThongTinDuAnWebV2_`
- `months` / `monthdata`
- V5 project token/QR generation
- project-aware catalog edit trigger
- confirmation onEdit trigger for X -> Y/Z/AA
- central AI worker reading active Registry rows only

## Change discipline after this checkpoint
Do not modify locked runtime behavior without:
1. identifying exact file/function/block,
2. stating cause,
3. backing up first,
4. changing only the required scope,
5. testing one feature at a time,
6. creating a new checkpoint after PASS.

## Next phase
Automatic project cloning must start from this PASS state and must not require cloning frontend HTML per project.
