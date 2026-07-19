const SPREADSHEET_ID = '1QvIVD7v2QRF_SajPz4RiYNdpt2OEOT0C9HHKkzV4hPc';
const API_VERSION = '2.0.0';

const SCHEMA = {
  Programs: ['id','name','type','date','audience','participants','organizer','trainer','description','createdAt','updatedAt','deletedAt'],
  Evaluations: ['id','programId','content','organization','trainer','goals','benefit','strengths','comment','createdAt'],
  Attendance: ['id','programId','name','email','phone','createdAt'],
  Users: ['email','name','role','active','createdAt','updatedAt'],
  ActivityLog: ['id','action','details','actor','createdAt'],
  Settings: ['key','value','updatedAt'],
  KPI_Goals: ['year','programs','participants','satisfaction','response','updatedAt']
};

function doGet(e) {
  try {
    setupDatabase_();
    const action = String((e && e.parameter && e.parameter.action) || 'health');
    const payload = route_({ action, data: e && e.parameter ? e.parameter : {} });
    return json_({ ok: true, version: API_VERSION, data: payload });
  } catch (error) {
    return json_({ ok: false, error: error.message, version: API_VERSION });
  }
}

function doPost(e) {
  try {
    setupDatabase_();
    const body = parseBody_(e);
    const payload = route_(body);
    return json_({ ok: true, version: API_VERSION, data: payload });
  } catch (error) {
    return json_({ ok: false, error: error.message, version: API_VERSION });
  }
}

function route_(request) {
  const action = String(request.action || '').trim();
  const data = request.data || {};

  switch (action) {
    case 'health': return health_();
    case 'bootstrap': return bootstrap_();
    case 'setup': setupDatabase_(); return health_();

    case 'programs.list': return listRows_('Programs', false);
    case 'programs.save': return saveProgram_(data);
    case 'programs.delete': return softDeleteProgram_(data.id);
    case 'programs.restore': return restoreProgram_(data.id);

    case 'evaluations.list': return filterByProgram_('Evaluations', data.programId);
    case 'evaluations.save': return appendEntity_('Evaluations', normalizeEvaluation_(data));

    case 'attendance.list': return filterByProgram_('Attendance', data.programId);
    case 'attendance.save': return saveAttendance_(data);

    case 'settings.get': return settingsObject_();
    case 'settings.save': return saveSettings_(data);

    case 'goals.list': return listRows_('KPI_Goals', true);
    case 'goals.save': return saveGoals_(data);

    case 'activity.list': return listRows_('ActivityLog', true);
    case 'activity.add': return logActivity_(data.action, data.details, data.actor);

    default: throw new Error('إجراء API غير معروف: ' + action);
  }
}

function setupDatabase_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SCHEMA).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = SCHEMA[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.autoResizeColumns(1, headers.length);
    } else {
      const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
      headers.forEach((header, index) => {
        if (current[index] !== header) sheet.getRange(1, index + 1).setValue(header);
      });
    }
  });

  const settings = settingsObject_();
  if (!settings.centerName) saveSettings_({ centerName: 'مركز الابتكار وريادة الأعمال' });
  if (!settings.universityName) saveSettings_({ universityName: 'جامعة الملك عبدالعزيز' });
}

function health_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    status: 'ready',
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetName: ss.getName(),
    sheets: Object.keys(SCHEMA),
    timestamp: new Date().toISOString()
  };
}

function bootstrap_() {
  return {
    programs: listRows_('Programs', false),
    evaluations: listRows_('Evaluations', true),
    attendance: listRows_('Attendance', true),
    settings: settingsObject_(),
    goals: listRows_('KPI_Goals', true),
    activityLog: listRows_('ActivityLog', true)
  };
}

function saveProgram_(data) {
  if (!data || !String(data.name || '').trim()) throw new Error('اسم البرنامج مطلوب');
  const now = new Date().toISOString();
  const id = String(data.id || ('PRG-' + Date.now()));
  const existing = findRowByKey_('Programs', 'id', id);
  const entity = {
    id,
    name: String(data.name || '').trim(),
    type: String(data.type || '').trim(),
    date: String(data.date || '').trim(),
    audience: String(data.audience || '').trim(),
    participants: Number(data.participants || 0),
    organizer: String(data.organizer || '').trim(),
    trainer: String(data.trainer || '').trim(),
    description: String(data.description || '').trim(),
    createdAt: existing ? existing.record.createdAt : now,
    updatedAt: now,
    deletedAt: ''
  };

  if (existing) updateRow_('Programs', existing.row, entity);
  else appendEntity_('Programs', entity);
  logActivity_(existing ? 'تحديث برنامج' : 'إنشاء برنامج', entity.name, data.actor);
  return entity;
}

function softDeleteProgram_(id) {
  if (!id) throw new Error('معرف البرنامج مطلوب');
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) throw new Error('البرنامج غير موجود');
  found.record.deletedAt = new Date().toISOString();
  found.record.updatedAt = found.record.deletedAt;
  updateRow_('Programs', found.row, found.record);
  logActivity_('حذف برنامج', found.record.name, 'system');
  return found.record;
}

function restoreProgram_(id) {
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) throw new Error('البرنامج غير موجود');
  found.record.deletedAt = '';
  found.record.updatedAt = new Date().toISOString();
  updateRow_('Programs', found.row, found.record);
  logActivity_('استعادة برنامج', found.record.name, 'system');
  return found.record;
}

function normalizeEvaluation_(data) {
  if (!data.programId) throw new Error('معرف البرنامج مطلوب');
  return {
    id: String(data.id || Utilities.getUuid()),
    programId: String(data.programId),
    content: numberBetween_(data.content, 1, 5),
    organization: numberBetween_(data.organization, 1, 5),
    trainer: numberBetween_(data.trainer, 1, 5),
    goals: numberBetween_(data.goals, 1, 5),
    benefit: numberBetween_(data.benefit, 1, 5),
    strengths: String(data.strengths || '').trim(),
    comment: String(data.comment || '').trim(),
    createdAt: String(data.createdAt || new Date().toISOString())
  };
}

function saveAttendance_(data) {
  if (!data.programId) throw new Error('معرف البرنامج مطلوب');
  if (!String(data.name || '').trim()) throw new Error('اسم المشارك مطلوب');
  const existing = listRows_('Attendance', true).find(row =>
    row.programId === String(data.programId) &&
    String(row.name || '').trim().toLowerCase() === String(data.name).trim().toLowerCase()
  );
  if (existing) throw new Error('المشارك مسجل مسبقًا');
  return appendEntity_('Attendance', {
    id: String(data.id || Utilities.getUuid()),
    programId: String(data.programId),
    name: String(data.name).trim(),
    email: String(data.email || '').trim(),
    phone: String(data.phone || '').trim(),
    createdAt: new Date().toISOString()
  });
}

function saveSettings_(data) {
  const sheet = sheet_('Settings');
  const now = new Date().toISOString();
  Object.keys(data || {}).forEach(key => {
    if (key === 'action') return;
    const found = findRowByKey_('Settings', 'key', key);
    const entity = { key, value: typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]), updatedAt: now };
    if (found) updateRow_('Settings', found.row, entity);
    else appendEntity_('Settings', entity);
  });
  return settingsObject_();
}

function settingsObject_() {
  const out = {};
  listRows_('Settings', true).forEach(row => {
    let value = row.value;
    try { value = JSON.parse(value); } catch (_) {}
    out[row.key] = value;
  });
  return out;
}

function saveGoals_(data) {
  const year = String(data.year || new Date().getFullYear());
  const entity = {
    year,
    programs: Number(data.programs || 0),
    participants: Number(data.participants || 0),
    satisfaction: Number(data.satisfaction || 0),
    response: Number(data.response || 0),
    updatedAt: new Date().toISOString()
  };
  const found = findRowByKey_('KPI_Goals', 'year', year);
  if (found) updateRow_('KPI_Goals', found.row, entity);
  else appendEntity_('KPI_Goals', entity);
  return entity;
}

function logActivity_(action, details, actor) {
  return appendEntity_('ActivityLog', {
    id: Utilities.getUuid(),
    action: String(action || ''),
    details: String(details || ''),
    actor: String(actor || Session.getActiveUser().getEmail() || 'system'),
    createdAt: new Date().toISOString()
  });
}

function listRows_(sheetName, includeDeleted) {
  const sheet = sheet_(sheetName);
  if (sheet.getLastRow() < 2) return [];
  const headers = SCHEMA[sheetName];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values.map(row => rowToObject_(headers, row)).filter(row => includeDeleted || !row.deletedAt);
}

function filterByProgram_(sheetName, programId) {
  const rows = listRows_(sheetName, true);
  return programId ? rows.filter(row => row.programId === String(programId)) : rows;
}

function appendEntity_(sheetName, entity) {
  const headers = SCHEMA[sheetName];
  sheet_(sheetName).appendRow(headers.map(key => entity[key] == null ? '' : entity[key]));
  return entity;
}

function updateRow_(sheetName, rowNumber, entity) {
  const headers = SCHEMA[sheetName];
  sheet_(sheetName).getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(key => entity[key] == null ? '' : entity[key])]);
}

function findRowByKey_(sheetName, key, value) {
  const sheet = sheet_(sheetName);
  const headers = SCHEMA[sheetName];
  const keyIndex = headers.indexOf(key);
  if (keyIndex < 0 || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][keyIndex]) === String(value)) {
      return { row: i + 2, record: rowToObject_(headers, values[i]) };
    }
  }
  return null;
}

function rowToObject_(headers, row) {
  return headers.reduce((obj, key, index) => {
    const value = row[index];
    obj[key] = value instanceof Date ? value.toISOString() : value;
    return obj;
  }, {});
}

function sheet_(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('ورقة غير موجودة: ' + name);
  return sheet;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('الطلب فارغ');
  try { return JSON.parse(e.postData.contents); }
  catch (_) { throw new Error('صيغة JSON غير صحيحة'); }
}

function numberBetween_(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error('قيمة التقييم يجب أن تكون بين 1 و5');
  return number;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
