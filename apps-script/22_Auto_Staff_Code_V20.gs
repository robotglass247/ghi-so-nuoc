/**
 * M&E WATER V20 - AUTO STAFF CODE
 * Tự sinh Mã nhân sự dạng NS001, NS002... khi nhập Họ và tên ở cột B.
 * Có hàm cài trigger + backfill các dòng đã có tên nhưng chưa có mã.
 * Không ghi đè mã đã có. Không tái sử dụng số đã cấp.
 */

function xuLyMaNhanSuProject_(e) {
  if (!e || !e.range) return;

  const sh = e.range.getSheet();
  if (sh.getName() !== 'NHAN_SU_THUC_HIEN') return;

  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();
  const startCol = e.range.getColumn();
  const endCol = startCol + e.range.getNumColumns() - 1;

  if (startRow + numRows - 1 < 5) return;
  if (startCol > 2 || endCol < 2) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;

  try {
    const ss = sh.getParent();
    let seq = waterStaffReadSequenceV20_(ss, sh);

    const firstRow = Math.max(5, startRow);
    const lastRow = startRow + numRows - 1;

    for (let row = firstRow; row <= lastRow; row++) {
      const name = String(sh.getRange(row, 2).getDisplayValue() || '').trim();
      const codeCell = sh.getRange(row, 1);
      const currentCode = String(codeCell.getDisplayValue() || '').trim();

      if (!name || currentCode) continue;

      seq += 1;
      codeCell.setValue(waterStaffFormatCodeV20_(seq));
    }

    waterStaffSaveSequenceV20_(ss, seq);

  } finally {
    lock.releaseLock();
  }
}

function waterStaffFormatCodeV20_(number) {
  return 'NS' + String(Number(number || 0)).padStart(3, '0');
}

function waterStaffSequenceKeyV20_(ss) {
  return 'WATER_STAFF_SEQ_' + ss.getId();
}

function waterStaffReadSequenceV20_(ss, sh) {
  const props = PropertiesService.getScriptProperties();
  const key = waterStaffSequenceKeyV20_(ss);
  const saved = Number(props.getProperty(key) || 0);

  if (saved > 0) return saved;

  let max = 0;
  const lastRow = Math.max(4, sh.getLastRow());

  if (lastRow >= 5) {
    const values = sh.getRange(5, 1, lastRow - 4, 1).getDisplayValues();

    values.forEach(function(r) {
      const m = String(r[0] || '').trim().toUpperCase().match(/^NS(\d+)$/);
      if (!m) return;
      max = Math.max(max, Number(m[1] || 0));
    });
  }

  props.setProperty(key, String(max));
  return max;
}

function waterStaffSaveSequenceV20_(ss, seq) {
  PropertiesService
    .getScriptProperties()
    .setProperty(
      waterStaffSequenceKeyV20_(ss),
      String(Number(seq || 0))
    );
}

function waterStaffBackfillV20_(ss) {
  const sh = ss.getSheetByName('NHAN_SU_THUC_HIEN');

  if (!sh || sh.getLastRow() < 5) {
    return {updated: 0};
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('Không lấy được khóa cấp Mã nhân sự.');
  }

  try {
    let seq = waterStaffReadSequenceV20_(ss, sh);
    let updated = 0;

    const lastRow = sh.getLastRow();
    const data = sh.getRange(5, 1, lastRow - 4, 2).getDisplayValues();

    data.forEach(function(r, idx) {
      const code = String(r[0] || '').trim();
      const name = String(r[1] || '').trim();

      if (!name || code) return;

      seq += 1;
      sh.getRange(idx + 5, 1).setValue(waterStaffFormatCodeV20_(seq));
      updated += 1;
    });

    waterStaffSaveSequenceV20_(ss, seq);
    SpreadsheetApp.flush();

    return {
      updated: updated,
      lastSequence: seq
    };

  } finally {
    lock.releaseLock();
  }
}

function caiTriggerMaNhanSuProject_(projectId) {
  const id = String(projectId || '').trim().toUpperCase();
  const ss = waterOpenProject_(id);
  const handler = 'xuLyMaNhanSuProject_';

  const exists = ScriptApp
    .getProjectTriggers()
    .some(function(t) {
      return (
        t.getHandlerFunction() === handler &&
        t.getTriggerSourceId() === ss.getId()
      );
    });

  if (!exists) {
    ScriptApp
      .newTrigger(handler)
      .forSpreadsheet(ss)
      .onEdit()
      .create();
  }

  const backfill = waterStaffBackfillV20_(ss);

  return {
    ok: true,
    projectId: id,
    sheetId: ss.getId(),
    triggerCreated: !exists,
    backfillUpdated: backfill.updated,
    lastSequence: backfill.lastSequence || 0
  };
}

function CAI_TRIGGER_MA_NHAN_SU_AUTO001() {
  const result = caiTriggerMaNhanSuProject_('AUTO001');
  Logger.log(JSON.stringify(result));
}

function TEST_MA_NHAN_SU_AUTO001() {
  const ss = waterOpenProject_('AUTO001');
  const sh = ss.getSheetByName('NHAN_SU_THUC_HIEN');

  Logger.log('SHEET=' + ss.getId());
  Logger.log('SEQ=' + waterStaffReadSequenceV20_(ss, sh));
  Logger.log('NEXT=' + waterStaffFormatCodeV20_(waterStaffReadSequenceV20_(ss, sh) + 1));
}
