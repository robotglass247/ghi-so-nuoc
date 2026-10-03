from pathlib import Path

p = Path('me-ops-auto/app.html')
s = p.read_text(encoding='utf-8')

start = s.find('async function load() {')
if start < 0:
    raise SystemExit('load() start not found')

marker = '/* ============================================================\n\n   XỬ LÝ ẢNH'
end = s.find(marker, start)
if end < 0:
    raise SystemExit('image marker not found')

new = r'''const MAINT_RESULT_CACHE_KEY =
  'meops_maintenance_initial_v1_' +
  String((window.MEOPS_PROJECT_CONFIG && window.MEOPS_PROJECT_CONFIG.projectCode) || 'NO_PROJECT')
    .trim()
    .toUpperCase();

const MAINT_RESULT_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function readMaintenanceResultCache() {
  try {
    const raw = localStorage.getItem(MAINT_RESULT_CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || !saved.data || !saved.ts) return null;
    const age = Date.now() - Number(saved.ts || 0);
    if (age < 0 || age > MAINT_RESULT_CACHE_MAX_AGE) return null;
    return saved;
  } catch (e) {
    return null;
  }
}

function writeMaintenanceResultCache(value) {
  try {
    if (!value || !Array.isArray(value.tasks)) return;
    localStorage.setItem(
      MAINT_RESULT_CACHE_KEY,
      JSON.stringify({ts: Date.now(), data: value})
    );
  } catch (e) {
    console.warn('[M&E OPS RESULT CACHE] Không lưu được cache', e);
  }
}

function applyMaintenanceInitialData(nextData, options = {}) {
  if (!nextData || !Array.isArray(nextData.tasks)) {
    throw Error('Dữ liệu bảo trì không hợp lệ.');
  }

  const source = options.source || 'live';
  const resetSearch = options.resetSearch === true;
  const previousTask = $('task').value;
  const previousSearch = $('search').value;

  data = nextData;

  const reportDate = String(data.reportDate || data.today || '');
  const reportLabel = reportDate
    ? reportDate.split('-').reverse().join('/')
    : '—';

  $('context').textContent =
    data.tasks.length +
    ' công việc · ' +
    (source === 'cache' ? 'Dữ liệu lần trước · ' : '') +
    'Ngày báo cáo ' + reportLabel;

  $('identity').textContent = source === 'cache'
    ? 'Đang hiển thị dữ liệu đã tải trước đó · hệ thống đang cập nhật dữ liệu mới…'
    : (live
        ? 'Tài khoản: ' + (data.user || '')
        : 'BẢN XEM TRƯỚC — dữ liệu tại thời điểm kiểm tra, không ghi Google Sheet');

  $('date').value = $('date').value || data.today || reportDate;
  if (data.today) $('date').max = data.today;

  $('warnings').textContent = Array.isArray(data.warnings)
    ? data.warnings.join('\n')
    : '';

  if (resetSearch) {
    $('search').value = '';
  } else {
    $('search').value = previousSearch;
  }

  updateClearSearchButton();
  renderOptions();

  if (!resetSearch && previousTask) {
    const exists = Array.from($('task').options).some(o => o.value === previousTask);
    if (exists) {
      $('task').value = previousTask;
      showTask();
    }
  }

  $('fields').disabled = false;
}

async function load() {
  $('reload').disabled = true;

  let cacheShown = false;
  const hadData = !!data;

  if (live && !hadData) {
    const cached = readMaintenanceResultCache();
    if (cached && cached.data) {
      try {
        applyMaintenanceInitialData(cached.data, {
          source: 'cache',
          resetSearch: true
        });
        cacheShown = true;
        message(
          'Đang hiển thị dữ liệu lần trước. Hệ thống đang cập nhật danh sách mới…',
          'info'
        );
      } catch (e) {
        console.warn('[M&E OPS RESULT CACHE] Cache lỗi', e);
      }
    }
  }

  if (!cacheShown && !hadData) {
    $('fields').disabled = true;
  }

  try {
    const fresh = live
      ? await call('getMaintenanceInitialData')
      : demo;

    if (!fresh) {
      throw Error(
        'Mở trang bằng đường dẫn Web App sau khi triển khai Apps Script.'
      );
    }

    if (live) writeMaintenanceResultCache(fresh);

    applyMaintenanceInitialData(fresh, {
      source: 'live',
      resetSearch: !cacheShown && !hadData
    });

    if (!live) {
      $('save').disabled = true;
      message(
        'Bản xem trước giao diện. Chức năng lưu chỉ hoạt động trên Apps Script.'
      );
    } else if (!fresh.photoReady) {
      message(
        'Dữ liệu mới đã cập nhật. Chưa thiết lập thư mục ảnh; vẫn có thể lưu báo cáo không ảnh hoặc chạy setupPA1 trước.'
      );
    } else if (!committed) {
      message(
        cacheShown
          ? 'Dữ liệu mới đã cập nhật ✓'
          : 'Đã tải danh sách. Chọn công việc để nhập kết quả.',
        'info'
      );
    }
  } catch (e) {
    if (cacheShown || hadData) {
      $('fields').disabled = false;
      message(
        'Đang dùng dữ liệu lần trước vì chưa cập nhật được dữ liệu mới: ' +
        (e.message || String(e)),
        'error'
      );
    } else {
      message(e.message || String(e), 'error');
    }
  } finally {
    $('reload').disabled = false;
  }
}



'''

s = s[:start] + new + s[end:]
p.write_text(s, encoding='utf-8')
print('patched app.html')
