export const DEFAULT_CONFIG = Object.freeze({
  configVersion: 1,
  app: {
    version: '9.0.0',
    build: 'dev',
    title: 'Ghi số nước'
  },
  capture: {
    jpegQuality: 0.84,
    maxImageDimension: 1600,
    duplicatePolicy: 'ASK'
  },
  sync: {
    enabled: true,
    autoSync: true,
    retryMs: 3000,
    resendAfterMs: 90000,
    maxBatchStatus: 50
  },
  offline: {
    enabled: true
  },
  staff: {
    activeStatus: 'Đang làm việc',
    displayMode: 'NAME_ONLY'
  }
});

export function validateProjectConfig(config){
  const errors=[];
  if(!config)errors.push('Thiếu WATER_PROJECT.');
  if(!config?.project?.id || config.project.id==='PROJECT_TEMPLATE')errors.push('Thiếu project.id hợp lệ.');
  if(!config?.backend?.url || config.backend.url.includes('PASTE_'))errors.push('Thiếu backend.url hợp lệ.');
  if(errors.length)throw new Error('Cấu hình dự án không hợp lệ: '+errors.join(' '));
  return true;
}

export function mergeProjectConfig(projectConfig){
  validateProjectConfig(projectConfig);
  return {
    ...DEFAULT_CONFIG,
    ...projectConfig,
    app:{...DEFAULT_CONFIG.app,...projectConfig.app},
    capture:{...DEFAULT_CONFIG.capture,...projectConfig.capture},
    sync:{...DEFAULT_CONFIG.sync,...projectConfig.sync},
    offline:{...DEFAULT_CONFIG.offline,...projectConfig.offline},
    staff:{...DEFAULT_CONFIG.staff,...projectConfig.staff}
  };
}
