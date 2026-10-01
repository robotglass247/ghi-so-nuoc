/*
M&E OPS - OVERDUE CURRENT DATE FIX v2
Ngày: 01/10/2026

CÁCH DÙNG:
1) Trong Apps Script mở file Mã.gs.
2) Tìm toàn bộ hàm: function getDashboardData(forceRefresh) { ... }
3) Thay NGUYÊN HÀM đó bằng nội dung bên dưới.
4) Lưu.
5) Triển khai -> Quản lý các lượt triển khai -> chọn deployment ...ThOTFt/exec
   -> Sửa -> Phiên bản mới -> Triển khai.
6) Không tạo deployment mới.

SỬA GÌ:
- Ghép kết quả thực tế mới nhất từ KQBT theo "ID công việc" vào CSDL_KE_HOACH
  trước khi tính Hoàn thành / Quá hạn / KPI tháng.
- Đổi Script Cache key sang V5_OVERDUE_CURRENT_DATE để không giữ số liệu cũ.
- Quá hạn chỉ tính công việc có Ngày KH TRƯỚC hôm nay và chưa hoàn thành sau khi ghép KQBT.
- Công việc có Ngày KH = hôm nay hoặc > hôm nay KHÔNG tính Quá hạn.
- Trả đầy đủ danh sách Quá hạn để frontend dùng thanh cuộn.
- Không thay logic "Hôm nay", "Tháng hiện tại", "7 ngày tới".
*/

function getDashboardData(forceRefresh) {

  const cache = CacheService.getScriptCache();

  const key = 'ME_OPS_DASHBOARD_V5_OVERDUE_CURRENT_DATE';



  if (!forceRefresh) {

    const cached = dashboardCacheGet_(cache, key);

    if (cached) return cached;

  }



  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const plans = sheetToObjects_(ss.getSheetByName(CONFIG.PLAN_SHEET), CONFIG.PLAN_HEADER_ROW);

  const results = sheetToObjects_(ss.getSheetByName(CONFIG.RESULT_SHEET), CONFIG.RESULT_HEADER_ROW);



  const now = new Date();

  const today = startOfDay_(now);

  const tomorrow = addDays_(today, 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const next7 = addDays_(today, 7);



  // ----- Chuẩn hoá kế hoạch -----

  const planRows = plans.map((r, i) => {

    const rawPlanDate = toDate_(value_(r, ['Ngày KH']));

    const planDate = rawPlanDate ? startOfDay_(rawPlanDate) : null;

    const pct = numberPercent_(value_(r, ['% Hoàn thành']));

    const status = text_(value_(r, ['Trạng thái']));

    return {

      rowNumber: i + CONFIG.PLAN_HEADER_ROW + 1,

      id: text_(value_(r, ['ID'])),

      planDate: planDate,

      planDateText: dateText_(planDate),

      system: text_(value_(r, ['Hệ thống'])),

      code: text_(value_(r, ['Mã'])),

      equipment: text_(value_(r, ['Hạng mục/Thiết bị'])),

      frequency: text_(value_(r, ['Tần suất'])),

      content: text_(value_(r, ['Nội dung thực hiện'])),

      workType: text_(value_(r, ['Loại công việc'])),

      owner: text_(value_(r, ['Người/BP phụ trách (tự động)', 'Người/BP phụ trách'])),

      level: text_(value_(r, ['Mức độ'])),

      status: status || (pct >= 100 ? 'Hoàn thành' : 'Chưa thực hiện'),

      actualDate: dateText_(toDate_(value_(r, ['Ngày thực hiện']))),

      result: text_(value_(r, ['Kết quả/Ghi chú'])),

      attachment: text_(value_(r, ['Tài liệu/Hình ảnh'])),

      percent: pct

    };

  }).filter(r => r.planDate);



  planRows.forEach(r => r.done = isDone_(r.status, r.percent));



  let todayTasks = planRows.filter(r => sameDay_(r.planDate, today));

  let overdue = planRows

    .filter(r => r.planDate < today && !r.done)

    .sort((a, b) => a.planDate - b.planDate);



  let monthPlans = planRows.filter(r => r.planDate >= monthStart && r.planDate < nextMonth);

  let monthDone = monthPlans.filter(r => r.done);

  let monthDoing = monthPlans.filter(r => !r.done && (r.percent > 0 || normalize_(r.status).indexOf('dang') >= 0));

  let monthOverdue = monthPlans.filter(r => r.planDate < today && !r.done);

  let kpiMonth = monthPlans.length ? Math.round(monthDone.length * 100 / monthPlans.length) : 0;



  let maintenanceDue = planRows.filter(r =>

    r.planDate >= today && r.planDate <= next7 &&

    !r.done &&

    /bao duong|bảo dưỡng/i.test(normalizeForSearch_(r.workType))

  );



  // ----- Chuẩn hoá kết quả / tồn tại -----

  const resultRows = results.map((r, i) => {

    const stamp = toDate_(value_(r, ['Dấu thời gian']));

    const actualDate = toDate_(value_(r, ['Ngày thực hiện']));

    return {

      rowNumber: i + CONFIG.RESULT_HEADER_ROW + 1,

      timestamp: stamp,

      actualDate: actualDate,

      actualDateText: dateText_(actualDate),

      taskText: text_(value_(r, ['Hạng mục công việc'])),

      result: text_(value_(r, ['Kết quả/Xử lý'])),

      issue: text_(value_(r, ['Tồn tại'])),

      nextAction: text_(value_(r, ['Hướng xử lý/Kế hoạch tiếp theo'])),

      image: text_(value_(r, ['Hình ảnh', 'Tài liệu/Hình ảnh'])),

      person: text_(value_(r, ['Người thực hiện'])),

      department: text_(value_(r, ['Bộ phận thực hiện'])),

      taskId: text_(value_(r, ['ID công việc'])),

      planDate: toDate_(value_(r, ['Ngày KH'])),

      percent: numberPercent_(value_(r, ['% Hoàn thành lũy kế', '% KL chuẩn hóa'])),

      status: text_(value_(r, ['Trạng thái'])),

      progress: text_(value_(r, ['Tiến độ so với KH']))

    };

  }).filter(r => r.timestamp || r.actualDate || r.taskId);



  // Chỉ lấy bản ghi mới nhất của mỗi ID công việc để tránh đếm trùng nhiều lần nhập.

  const latestResultByTask = {};

  resultRows.forEach(r => {

    const keyTask = r.taskId || r.taskText || ('ROW_' + r.rowNumber);

    const old = latestResultByTask[keyTask];

    const currentTime = (r.timestamp || r.actualDate || new Date(0)).getTime();

    const oldTime = old ? (old.timestamp || old.actualDate || new Date(0)).getTime() : -1;

    if (!old || currentTime >= oldTime) latestResultByTask[keyTask] = r;

  });

  const latestResults = Object.values(latestResultByTask);



  // ----- GHÉP KQBT VÀO KẾ HOẠCH TRƯỚC KHI TÍNH KPI -----
  // KQBT là nguồn tiến độ thực tế. Dùng bản ghi mới nhất theo ID công việc.
  const latestResultById = {};
  latestResults.forEach(r => {
    const idKey = normalizeKey_(r.taskId);
    if (idKey) latestResultById[idKey] = r;
  });

  let matchedResultPlans = 0;

  planRows.forEach(r => {
    const rr = r.id ? latestResultById[normalizeKey_(r.id)] : null;

    if (rr) {
      matchedResultPlans++;

      // % Hoàn thành lũy kế trong KQBT là tiến độ thực tế.
      // Dùng giá trị lớn hơn để không làm giảm tiến độ đã ghi trong kế hoạch.
      r.percent = Math.max(Number(r.percent || 0), Number(rr.percent || 0));

      // Trạng thái mới nhất từ KQBT được ưu tiên khi có giá trị.
      if (rr.status) r.status = rr.status;

      if (rr.actualDateText) r.actualDate = rr.actualDateText;
      if (rr.result) r.result = rr.result;
    }

    r.done = isDone_(r.status, r.percent);
  });

  // Tính lại toàn bộ KPI sau khi đã ghép tiến độ thực tế.
  todayTasks = planRows.filter(r => sameDay_(r.planDate, today));

  overdue = planRows
    .filter(r => r.planDate < today && !r.done)
    .sort((a, b) => a.planDate - b.planDate);

  monthPlans = planRows.filter(r => r.planDate >= monthStart && r.planDate < nextMonth);
  monthDone = monthPlans.filter(r => r.done);
  monthDoing = monthPlans.filter(r =>
    !r.done && (r.percent > 0 || normalize_(r.status).indexOf('dang') >= 0)
  );
  monthOverdue = monthPlans.filter(r => r.planDate < today && !r.done);
  kpiMonth = monthPlans.length
    ? Math.round(monthDone.length * 100 / monthPlans.length)
    : 0;

  maintenanceDue = planRows.filter(r =>
    r.planDate >= today && r.planDate <= next7 &&
    !r.done &&
    /bao duong|bảo dưỡng/i.test(normalizeForSearch_(r.workType))
  );



  const openIssues = latestResults

    .filter(r => hasRealIssue_(r.issue))

    .sort((a, b) => {

      const da = a.actualDate || a.timestamp || new Date(0);

      const db = b.actualDate || b.timestamp || new Date(0);

      return db - da;

    });



  // ----- Alert datasets -----

  const overdueAlerts = overdue.map(r => ({

    icon: '⚠',

    title: r.equipment || r.content || r.id,

    badge: 'Quá hạn ' + Math.max(1, daysBetween_(r.planDate, today)) + ' ngày',

    location: shortSystem_(r.system),

    type: 'overdue',

    id: r.id

  }));



  const issueAlerts = openIssues.slice(0, 20).map(r => ({

    icon: '🔥',

    title: taskNameFromResult_(r),

    badge: r.issue.length > 32 ? 'Có tồn tại' : r.issue,

    location: r.person || r.department || 'Kỹ thuật',

    type: 'incident',

    id: r.taskId

  }));



  const maintainAlerts = maintenanceDue.slice(0, 20).map(r => ({

    icon: '🛠',

    title: r.equipment || r.content || r.id,

    badge: sameDay_(r.planDate, today) ? 'Đến hạn hôm nay' : 'Đến hạn ' + daysBetween_(today, r.planDate) + ' ngày',

    location: shortSystem_(r.system),

    type: 'maintenance',

    id: r.id

  }));



  const inspectionDue = planRows.filter(r =>

    r.planDate >= today && r.planDate <= next7 &&

    !r.done &&

    /kiem tra|kiểm tra|kiem dinh|kiểm định/i.test(normalizeForSearch_(r.workType + ' ' + r.content))

  );

  const inspectionAlerts = inspectionDue.slice(0, 20).map(r => ({

    icon: '📋',

    title: r.equipment || r.content || r.id,

    badge: sameDay_(r.planDate, today) ? 'Hôm nay' : 'Còn ' + daysBetween_(today, r.planDate) + ' ngày',

    location: shortSystem_(r.system),

    type: 'inspection',

    id: r.id

  }));



  // ----- Incident chart: chia tháng thành 4 cụm tuần -----

  const weeklyIncidents = [0, 0, 0, 0];

  resultRows.forEach(r => {

    const d = r.actualDate || r.timestamp;

    if (!d || d < monthStart || d >= nextMonth || !hasRealIssue_(r.issue)) return;

    const bucket = Math.min(3, Math.floor((d.getDate() - 1) / 7));

    weeklyIncidents[bucket]++;

  });



  // ----- Thiết bị: suy ra từ danh mục hạng mục/thiết bị trong kế hoạch -----

  const equipmentSet = new Set(planRows.map(r => r.equipment).filter(Boolean));

  const overdueEquipment = new Set(overdue.map(r => r.equipment).filter(Boolean));

  const issueEquipment = new Set(

    openIssues.map(r => {

      const p = planRows.find(x => x.id === r.taskId);

      return p ? p.equipment : taskNameFromResult_(r);

    }).filter(Boolean)

  );

  const totalEquipment = equipmentSet.size;

  const repairCount = issueEquipment.size;

  const maintenanceCount = overdueEquipment.size;

  const activeEquipment = Math.max(0, totalEquipment - repairCount);



  const systemCounts = buildSystemCounts_(monthPlans);



  const payload = {

    meta: {

      title: ss.getName(),

      date: dateText_(today),

      generatedAt: Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm:ss'),
      kpiSource: 'CSDL_KE_HOACH + latest KQBT by task ID',
      matchedResultPlans: matchedResultPlans,
      latestResultCount: latestResults.length

    },

    kpi: {

      todayTotal: todayTasks.length,

      todayDone: todayTasks.filter(r => r.done).length,

      overdue: overdue.length,

      openIncidents: openIssues.length,

      maintenanceDue: maintenanceDue.length,

      monthPercent: kpiMonth

    },

    todayTasks: todayTasks.slice(0, 50).map((r, i) => ({

      stt: i + 1,

      time: '—',

      system: cleanSystem_(r.system),

      task: r.equipment || r.content || r.id,

      area: r.level || '—',

      owner: r.owner || 'Kỹ thuật',

      status: r.status,

      percent: r.percent,

      id: r.id

    })),

    alerts: {

      overdue: overdueAlerts,

      incident: issueAlerts,

      maintenance: maintainAlerts,

      inspection: inspectionAlerts

    },

    counts: {

      overdue: overdue.length,

      incident: issueAlerts.length,

      maintenance: maintainAlerts.length,

      inspection: inspectionAlerts.length

    },

    progress: {

      completed: monthDone.length,

      doing: monthDoing.length,

      pending: Math.max(0, monthPlans.length - monthDone.length - monthDoing.length),

      percent: kpiMonth

    },

    maintenance: {

      total: monthPlans.length,

      completed: monthDone.length,

      doing: monthDoing.length,

      overdue: monthOverdue.length

    },

    weeklyIncidents: weeklyIncidents,

    assets: {

      total: totalEquipment,

      active: activeEquipment,

      maintenance: maintenanceCount,

      repair: repairCount

    },

    systems: systemCounts

  };



  try {

    dashboardCachePut_(cache, key, payload, CONFIG.CACHE_SECONDS);

  } catch (e) {

    console.warn('[M&E OPS] Không ghi được Dashboard cache: ' + e);

  }

  return payload;

}
