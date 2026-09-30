// PATCH 2026-09-30
// Chỉ thay toàn bộ hàm layThongTinDuAnWeb_(ss) trong 10_Backend_Core.gs.
// Không sửa waterUiStatePost_, doPost, staff, progress, upload, sync.

function layThongTinDuAnWeb_(ss) {
  const sh = ss.getSheetByName('THONG_TIN_DU_AN');

  if (!sh || sh.getLastRow() < 2) {
    return '';
  }

  const r = sh.getRange(2, 1, 1, 13).getDisplayValues()[0];
  const text = function(v) {
    return String(v || '').trim();
  };

  const parts = [];

  if (text(r[1]))  parts.push('Dự án: ' + text(r[1]));
  if (text(r[0]))  parts.push('Mã dự án: ' + text(r[0]));
  if (text(r[2]))  parts.push('Địa chỉ: ' + text(r[2]));
  if (text(r[3]))  parts.push('Đơn vị QLVH: ' + text(r[3]));
  if (text(r[4]))  parts.push('Người phụ trách: ' + text(r[4]));
  if (text(r[5]))  parts.push('Trạng thái: ' + text(r[5]));
  if (text(r[6]))  parts.push('Ngày bắt đầu: ' + text(r[6]));
  if (text(r[7]))  parts.push('Ngày kết thúc: ' + text(r[7]));
  if (text(r[8]))  parts.push('Hạn ghi: ' + text(r[8]) + ' ngày');
  if (text(r[9]))  parts.push('Ghi chú: ' + text(r[9]));
  if (text(r[10])) parts.push('Cập nhật lúc: ' + text(r[10]));
  if (text(r[11])) parts.push('Ảnh dự án: ' + text(r[11]));
  if (text(r[12])) parts.push('Kỳ TB tiêu thụ: ' + text(r[12]));

  return parts.join(' · ');
}
