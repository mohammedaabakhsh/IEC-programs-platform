const SPREADSHEET_ID = '1tQL7hawesc00YbM2ig0rbiinmnhjr3VYOQ3-55Z0DKI';
const API_VERSION = '2.1.0';

const TABLES = {
  Programs: {
    title: 'البرامج',
    keys: ['id','name','type','date','audience','participants','organizer','trainer','description','createdAt','updatedAt','deletedAt'],
    headers: ['المعرّف','اسم البرنامج','نوع النشاط','التاريخ','الفئة المستهدفة','عدد المشاركين','الجهة المنظمة','المدرب أو مقدم الجلسة','الوصف','تاريخ الإنشاء','آخر تحديث','تاريخ الحذف']
  },
  Evaluations: {
    title: 'التقييمات',
    keys: ['id','programId','content','organization','trainer','goals','benefit','strengths','comment','createdAt'],
    headers: ['المعرّف','معرّف البرنامج','المحتوى','التنظيم','المدرب','تحقق الأهداف','الاستفادة','نقاط القوة','الملاحظات','تاريخ الإرسال']
  },
  Attendance: {
    title: 'الحضور',
    keys: ['id','programId','name','email','phone','createdAt'],
    headers: ['المعرّف','معرّف البرنامج','اسم المشارك','البريد الإلكتروني','رقم الجوال','تاريخ التسجيل']
  },
  Users: {
    title: 'المستخدمون',
    keys: ['email','name','role','active','createdAt','updatedAt'],
    headers: ['البريد الإلكتروني','الاسم','الصلاحية','نشط','تاريخ الإنشاء','آخر تحديث']
  },
  ActivityLog: {
    title: 'سجل النشاط',
    keys: ['id','action','details','actor','createdAt'],
    headers: ['المعرّف','الإجراء','التفاصيل','المنفذ','التاريخ']
  },
  Settings: {
    title: 'الإعدادات',
    keys: ['key','value','updatedAt'],
    headers: ['المفتاح','القيمة','آخر تحديث']
  },
  KPI_Goals: {
    title: 'أهداف المؤشرات',
    keys: ['year','programs','participants','satisfaction','response','updatedAt'],
    headers: ['السنة','هدف البرامج','هدف المشاركين','هدف الرضا','هدف الاستجابة','آخر تحديث']
  }
};

function doGet(e) {
  try {
    setupDatabase_();
    const action = String((e && e.parameter && e.parameter.action) || 'health');
    return json_({ ok: true, version: API_VERSION, data: route_({ action, data: e && e.parameter ? e.parameter : {} }) });
  } catch (error) {
    return json_({ ok: false, error: error.message, version: API_VERSION });
  }
}

function doPost(e) {
  try {
    setupDatabase_();
    return json_({ ok: true, version: API_VERSION, data: route_(parseBody_(e)) });
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
    default: throw new Error('إجراء غير معروف: ' + action);
  }
}

function setupDatabase_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(TABLES).forEach(name => {
    const config = TABLES[name];
    let sheet = ss.getSheetByName(config.title);
    const oldSheet = ss.getSheetByName(name);
    if (!sheet && oldSheet) {
      oldSheet.setName(config.title);
      sheet = oldSheet;
    }
    if (!sheet) sheet = ss.insertSheet(config.title);
    sheet.setRightToLeft(true);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold').setHorizontalAlignment('right');
    sheet.autoResizeColumns(1, config.headers.length);
  });
  const settings = settingsObject_();
  if (!settings.centerName) saveSettings_({ centerName: 'مركز الابتكار وريادة الأعمال' });
  if (!settings.universityName) saveSettings_({ universityName: 'جامعة الملك عبدالعزيز' });
}

function health_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return { status: 'جاهز', spreadsheetId: SPREADSHEET_ID, spreadsheetName: ss.getName(), sheets: Object.values(TABLES).map(x => x.title), timestamp: new Date().toISOString() };
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
  if (existing) updateRow_('Programs', existing.row, entity); else appendEntity_('Programs', entity);
  logActivity_(existing ? 'تحديث برنامج' : 'إنشاء برنامج', entity.name, data.actor);
  return entity;
}

function softDeleteProgram_(id) {
  if (!id) throw new Error('معرّف البرنامج مطلوب');
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) throw new Error('البرنامج غير موجود');
  found.record.deletedAt = new Date().toISOString();
  found.record.updatedAt = found.record.deletedAt;
  updateRow_('Programs', found.row, found.record);
  logActivity_('حذف برنامج', found.record.name, 'النظام');
  return found.record;
}

function restoreProgram_(id) {
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) throw new Error('البرنامج غير موجود');
  found.record.deletedAt = '';
  found.record.updatedAt = new Date().toISOString();
  updateRow_('Programs', found.row, found.record);
  logActivity_('استعادة برنامج', found.record.name, 'النظام');
  return found.record;
}

function normalizeEvaluation_(data) {
  if (!data.programId) throw new Error('معرّف البرنامج مطلوب');
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
  if (!data.programId) throw new Error('معرّف البرنامج مطلوب');
  if (!String(data.name || '').trim()) throw new Error('اسم المشارك مطلوب');
  const existing = listRows_('Attendance', true).find(row => row.programId === String(data.programId) && String(row.name || '').trim().toLowerCase() === String(data.name).trim().toLowerCase());
  if (existing) throw new Error('المشارك مسجل مسبقًا');
  return appendEntity_('Attendance', { id: String(data.id || Utilities.getUuid()), programId: String(data.programId), name: String(data.name).trim(), email: String(data.email || '').trim(), phone: String(data.phone || '').trim(), createdAt: new Date().toISOString() });
}

function saveSettings_(data) {
  const now = new Date().toISOString();
  Object.keys(data || {}).forEach(key => {
    if (key === 'action') return;
    const found = findRowByKey_('Settings', 'key', key);
    const entity = { key, value: typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]), updatedAt: now };
    if (found) updateRow_('Settings', found.row, entity); else appendEntity_('Settings', entity);
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
  const entity = { year, programs: Number(data.programs || 0), participants: Number(data.participants || 0), satisfaction: Number(data.satisfaction || 0), response: Number(data.response || 0), updatedAt: new Date().toISOString() };
  const found = findRowByKey_('KPI_Goals', 'year', year);
  if (found) updateRow_('KPI_Goals', found.row, entity); else appendEntity_('KPI_Goals', entity);
  return entity;
}

function logActivity_(action, details, actor) {
  return appendEntity_('ActivityLog', { id: Utilities.getUuid(), action: String(action || ''), details: String(details || ''), actor: String(actor || Session.getActiveUser().getEmail() || 'النظام'), createdAt: new Date().toISOString() });
}

function listRows_(tableName, includeDeleted) {
  const sheet = sheet_(tableName);
  const keys = TABLES[tableName].keys;
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, keys.length).getValues();
  return values.map(row => rowToObject_(keys, row)).filter(row => includeDeleted || !row.deletedAt);
}

function filterByProgram_(tableName, programId) {
  const rows = listRows_(tableName, true);
  return programId ? rows.filter(row => row.programId === String(programId)) : rows;
}

function appendEntity_(tableName, entity) {
  const keys = TABLES[tableName].keys;
  sheet_(tableName).appendRow(keys.map(key => entity[key] == null ? '' : entity[key]));
  return entity;
}

function updateRow_(tableName, rowNumber, entity) {
  const keys = TABLES[tableName].keys;
  sheet_(tableName).getRange(rowNumber, 1, 1, keys.length).setValues([keys.map(key => entity[key] == null ? '' : entity[key])]);
}

function findRowByKey_(tableName, key, value) {
  const sheet = sheet_(tableName);
  const keys = TABLES[tableName].keys;
  const keyIndex = keys.indexOf(key);
  if (keyIndex < 0 || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, keys.length).getValues();
  for (let i = 0; i < values.length; i++) if (String(values[i][keyIndex]) === String(value)) return { row: i + 2, record: rowToObject_(keys, values[i]) };
  return null;
}

function rowToObject_(keys, row) {
  return keys.reduce((obj, key, index) => {
    const value = row[index];
    obj[key] = value instanceof Date ? value.toISOString() : value;
    return obj;
  }, {});
}

function sheet_(tableName) {
  const title = TABLES[tableName].title;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(title);
  if (!sheet) throw new Error('ورقة غير موجودة: ' + title);
  return sheet;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('الطلب فارغ');
  try { return JSON.parse(e.postData.contents); } catch (_) { throw new Error('صيغة البيانات غير صحيحة'); }
}

function numberBetween_(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error('قيمة التقييم يجب أن تكون بين 1 و5');
  return number;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}