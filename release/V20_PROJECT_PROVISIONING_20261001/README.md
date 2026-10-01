# V20 PROJECT PROVISIONING — 2026-10-01

## Scope
Automatic project cloning/provisioning layer built on top of the locked V20 runtime. This release does not modify the PASS V20 frontend capture/manage runtime.

## Master template
- File: `MASTER_TEMPLATE_WATER_V20_PASS`
- Sheet ID: `1xxpH0znT_aT0UP74fOY9Z4eFa5DnSk96TvJxOELllh4`
- Source: `PASS_TEST5_FULL_SYSTEM_20261001`
- Data from TEST5 removed.
- GHI_SO_HANG_THANG formulas G/I/Y normalized.
- CAN_XU_LY source link changed from absolute TEST5 Sheet URL to internal gid link.
- Dynamic project placeholders retained only where provisioning replaces them.

## Registry
- File: `PROJECT_REGISTRY - APP NUOC`
- ID: `1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0`
- Existing A:I schema preserved.
- Added J:Q: PROJECT_FOLDER_ID, PHOTO_FOLDER_ID, APP_URL, CREATE_STATUS, LAST_CHECK, ERROR_STEP, ERROR_MESSAGE, TEMPLATE_ID.
- `TAO_DU_AN` redesigned as the administration form.
- `TAO_DU_AN!B15` is the create-request checkbox.

## Apps Script module
- Path: `apps-script/20_Project_Provisioning_V20.gs`
- One-time setup entrypoint: `CAI_DAT_HE_THONG_NHAN_BAN_V20()`
- Daily use: fill `TAO_DU_AN!B2:B12`, then tick `B15`.

## Provisioning flow
1. Validate and normalize PROJECT_ID.
2. Reject duplicate PROJECT_ID.
3. Create project folder under `02_PROJECTS`.
4. Create direct child folder `ẢNH GHI SỐ` (same structure as TEST5 PASS).
5. Copy clean V20 master into project folder.
6. Write THONG_TIN_DU_AN.
7. Register SHEET_ID/folder IDs/App URL in PROJECTS.
8. Install per-project QR and confirmation onEdit triggers.
9. Apply input-only protection to all sheets.
10. Reorder visible management sheets and hide technical sheets.
11. Verify required sheets, project identity, folders, triggers, router and photo-folder routing.
12. Set Registry STATUS/CREATE_STATUS to READY only after verification succeeds.

## Reused PASS handlers
- `xuLyOnEditDanhMucProject_`
- `xuLyXacNhanKiemTraProject_`
- `waterOpenProject_`
- `waterProjectPhotoFolder_`

## App URL pattern
`https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html?project=<PROJECT_ID>`

## Safety
- The locked V20 frontend/runtime files are not modified by this provisioning release.
- Failed provisioning is marked ERROR in Registry when a Registry row exists; files are not automatically deleted so the cause can be inspected.
