function normalizeProjectId(projectId){
  const id=String(projectId||'').trim().toUpperCase();
  if(!/^[A-Z0-9_-]{2,64}$/.test(id))throw new Error('PROJECT_ID không hợp lệ.');
  return id;
}

export function createStorageNamespace(projectId){
  const id=normalizeProjectId(projectId);
  const prefix=`water:${id}`;

  return Object.freeze({
    projectId:id,
    key(name){
      const n=String(name||'').trim();
      if(!n)throw new Error('Tên storage key rỗng.');
      return `${prefix}:${n}`;
    },
    dbName(schemaVersion=1){
      return `water_${id}_v${Number(schemaVersion)||1}`;
    },
    cacheName(appVersion,build){
      return `water-${id}-${String(appVersion||'0')}-${String(build||'dev')}`;
    },
    captureKey(period,meter){
      return `${prefix}:capture:${String(period||'')}:${String(meter||'').toUpperCase()}`;
    }
  });
}
