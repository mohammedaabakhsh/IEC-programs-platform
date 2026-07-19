const SPREADSHEET_ID = '1tQL7hawesc00YbM2ig0rbiinmnhjr3VYOQ3-55Z0DKI';
const MASTER_EVALUATION_FORM_ID = '1M9hTHW6AMfBLDEh_x2G2EVD373lXLzl9S1h9MlOeiaI';
const API_VERSION = '2.5.1';

const TABLES = {
  Programs: {
    title: 'البرامج',
    keys: ['id','name','type','date','audience','participants','organizer','trainer','description','evaluationUrl','createdAt','updatedAt','deletedAt'],
    headers: ['المعرّف','اسم البرنامج','نوع النشاط','التاريخ','الفئة المستهدفة','عدد المشاركين','الجهة المنظمة','المدرب أو مقدم الجلسة','الوصف','رابط نموذج التقييم','تاريخ الإنشاء','آخر تحديث','تاريخ الحذف']
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
    case 'forms.setup': return setupEvaluationForm_();
    case 'forms.status': return evaluationFormStatus_();
    case 'programs.list': return listRows_('Programs', false);
    case 'programs.deleted': return listRows_('Programs', true).filter(row => row.deletedAt);
    case 'programs.save': return saveProgram_(data);
    case 'programs.delete': return softDeleteProgram_(data.id);
    case 'programs.restore': return restoreProgram_(data.id);
    case 'programs.deletePermanent': return deleteProgramPermanent_(data.id);
    case 'evaluations.list': return filterByProgram_('Evaluations', data.programId);
    case 'evaluations.save': return saveEvaluation_(data);
    case 'evaluations.delete': return deleteEntity_('Evaluations', data.id);
    case 'attendance.list': return filterByProgram_('Attendance', data.programId);
    case 'attendance.save': return saveAttendance_(data);
    case 'attendance.delete': return deleteEntity_('Attendance', data.id);
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
  removeLegacyUsersSheets_(ss);
  Object.keys(TABLES).forEach(name => {
    const config = TABLES[name];
    let sheet = ss.getSheetByName(config.title);
    const oldSheet = ss.getSheetByName(name);
    if (!sheet && oldSheet) { oldSheet.setName(config.title); sheet = oldSheet; }
    if (!sheet) sheet = ss.insertSheet(config.title);
    migrateSheet_(name, sheet);
    sheet.setRightToLeft(true);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold').setHorizontalAlignment('right');
  });
  const settings = settingsObject_();
  if (!settings.centerName) saveSettings_({ centerName: 'مركز الابتكار وريادة الأعمال' });
  if (!settings.universityName) saveSettings_({ universityName: 'جامعة الملك عبدالعزيز' });
}

function migrateSheet_(tableName, sheet) {
  if (tableName !== 'Programs' || sheet.getLastColumn() < 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const evaluationHeader = TABLES.Programs.headers[9];
  if (headers.indexOf(evaluationHeader) === -1 && headers.indexOf('تاريخ الإنشاء') >= 0) {
    sheet.insertColumnBefore(10);
    sheet.getRange(1, 10).setValue(evaluationHeader);
  }
}

function removeLegacyUsersSheets_(ss) {
  ['المستخدمون', 'Users'].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
  });
}

function health_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return { status: 'جاهز', version: API_VERSION, spreadsheetId: SPREADSHEET_ID, spreadsheetName: ss.getName(), sheets: Object.values(TABLES).map(x => x.title), form: evaluationFormStatus_(), timestamp: new Date().toISOString() };
}

function bootstrap_() {
  return {
    programs: listRows_('Programs', false),
    deletedPrograms: listRows_('Programs', true).filter(row => row.deletedAt),
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
    participants: Math.max(0, Number(data.participants || 0)),
    organizer: String(data.organizer || '').trim(),
    trainer: String(data.trainer || '').trim(),
    description: String(data.description || '').trim(),
    evaluationUrl: '',
    createdAt: existing ? existing.record.createdAt : now,
    updatedAt: now,
    deletedAt: existing ? String(existing.record.deletedAt || '') : ''
  };
  try { entity.evaluationUrl = buildEvaluationUrl_(entity); }
  catch (error) { entity.evaluationUrl = String((existing && existing.record.evaluationUrl) || data.evaluationUrl || ''); }
  if (existing) updateRow_('Programs', existing.row, entity); else appendEntity_('Programs', entity);
  logActivity_(existing ? 'تحديث برنامج' : 'إنشاء برنامج', entity.name, data.actor);
  return entity;
}

function softDeleteProgram_(id) {
  if (!id) throw new Error('معرّف البرنامج مطلوب');
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) return { id: String(id), alreadyDeleted: true };
  if (!found.record.deletedAt) {
    found.record.deletedAt = new Date().toISOString();
    found.record.updatedAt = found.record.deletedAt;
    updateRow_('Programs', found.row, found.record);
    logActivity_('حذف برنامج', found.record.name, 'النظام');
  }
  return found.record;
}

function restoreProgram_(id) {
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) throw new Error('البرنامج غير موجود');
  found.record.deletedAt = '';
  found.record.updatedAt = new Date().toISOString();
  if (!found.record.evaluationUrl) found.record.evaluationUrl = buildEvaluationUrl_(found.record);
  updateRow_('Programs', found.row, found.record);
  logActivity_('استعادة برنامج', found.record.name, 'النظام');
  return found.record;
}

function deleteProgramPermanent_(id) {
  if (!id) throw new Error('معرّف البرنامج مطلوب');
  const found = findRowByKey_('Programs', 'id', id);
  if (!found) return { id: String(id), alreadyDeleted: true };
  deleteRowsByProgram_('Evaluations', id);
  deleteRowsByProgram_('Attendance', id);
  sheet_('Programs').deleteRow(found.row);
  logActivity_('حذف نهائي', found.record.name, 'النظام');
  return { id: String(id), deleted: true };
}

function saveEvaluation_(data) {
  const entity = normalizeEvaluation_(data);
  const existing = findRowByKey_('Evaluations', 'id', entity.id);
  if (existing) return existing.record;
  appendEntity_('Evaluations', entity);
  return entity;
}

function normalizeEvaluation_(data) {
  if (!data.programId) throw new Error('معرّف البرنامج مطلوب');
  if (!findRowByKey_('Programs', 'id', data.programId)) throw new Error('البرنامج غير موجود');
  return {
    id: String(data.id || Utilities.getUuid()), programId: String(data.programId),
    content: numberBetween_(data.content, 1, 5), organization: numberBetween_(data.organization, 1, 5),
    trainer: numberBetween_(data.trainer, 1, 5), goals: numberBetween_(data.goals, 1, 5), benefit: numberBetween_(data.benefit, 1, 5),
    strengths: String(data.strengths || '').trim(), comment: String(data.comment || '').trim(),
    createdAt: String(data.createdAt || new Date().toISOString())
  };
}

function saveAttendance_(data) {
  if (!data.programId) throw new Error('معرّف البرنامج مطلوب');
  if (!findRowByKey_('Programs', 'id', data.programId)) throw new Error('البرنامج غير موجود');
  if (!String(data.name || '').trim()) throw new Error('اسم المشارك مطلوب');
  const id = String(data.id || Utilities.getUuid());
  const byId = findRowByKey_('Attendance', 'id', id);
  if (byId) return byId.record;
  const email = String(data.email || '').trim().toLowerCase();
  const phone = String(data.phone || '').replace(/\D/g, '');
  const name = String(data.name).trim();
  const existing = listRows_('Attendance', true).find(row => row.programId === String(data.programId) && (
    (email && String(row.email || '').trim().toLowerCase() === email) ||
    (phone && String(row.phone || '').replace(/\D/g, '') === phone) ||
    String(row.name || '').trim().toLowerCase() === name.toLowerCase()
  ));
  if (existing) return existing;
  return appendEntity_('Attendance', { id, programId: String(data.programId), name, email: String(data.email || '').trim(), phone: String(data.phone || '').trim(), createdAt: String(data.createdAt || new Date().toISOString()) });
}

function deleteEntity_(tableName, id) {
  if (!id) throw new Error('المعرّف مطلوب');
  const found = findRowByKey_(tableName, 'id', id);
  if (!found) return { id: String(id), alreadyDeleted: true };
  sheet_(tableName).deleteRow(found.row);
  return { id: String(id), deleted: true };
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
  listRows_('Settings', true).forEach(row => { let value = row.value; try { value = JSON.parse(value); } catch (_) {} out[row.key] = value; });
  return out;
}

function saveGoals_(data) {
  const year = String(data.year || new Date().getFullYear());
  const entity = { year, programs: Number(data.programs || 0), participants: Number(data.participants || 0), satisfaction: Number(data.satisfaction || 0), response: Number(data.response || 0), updatedAt: new Date().toISOString() };
  const found = findRowByKey_('KPI_Goals', 'year', year);
  if (found) updateRow_('KPI_Goals', found.row, entity); else appendEntity_('KPI_Goals', entity);
  return entity;
}

function setupEvaluationForm_() {
  const form = FormApp.openById(MASTER_EVALUATION_FORM_ID);
  const programItems = ensureProgramItems_(form);
  if (form.getDestinationId() !== SPREADSHEET_ID) form.setDestination(FormApp.DestinationType.SPREADSHEET, SPREADSHEET_ID);
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'onGoogleFormSubmit_').forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('onGoogleFormSubmit_').forForm(form).onFormSubmit().create();
  saveSettings_({ evaluationFormId: MASTER_EVALUATION_FORM_ID, evaluationFormUrl: form.getPublishedUrl(), evaluationFormSetupAt: new Date().toISOString() });
  return { ready: true, formId: MASTER_EVALUATION_FORM_ID, publishedUrl: form.getPublishedUrl(), programIdItem: programItems.id.getId(), programNameItem: programItems.name.getId() };
}

function evaluationFormStatus_() {
  try {
    const form = FormApp.openById(MASTER_EVALUATION_FORM_ID);
    const triggers = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'onGoogleFormSubmit_');
    return { ready: triggers.length === 1, title: form.getTitle(), publishedUrl: form.getPublishedUrl(), destinationId: form.getDestinationId(), triggerCount: triggers.length };
  } catch (error) {
    return { ready: false, error: error.message };
  }
}

function ensureProgramItems_(form) {
  let idItem = null, nameItem = null;
  form.getItems(FormApp.ItemType.TEXT).forEach(item => {
    const title = normalizeTitle_(item.getTitle());
    if (title === normalizeTitle_('معرّف البرنامج')) idItem = item.asTextItem();
    if (title === normalizeTitle_('اسم البرنامج')) nameItem = item.asTextItem();
  });
  if (!idItem) idItem = form.addTextItem().setTitle('معرّف البرنامج').setHelpText('يُعبأ تلقائيًا من منصة المركز، يرجى عدم تعديله.').setRequired(true);
  if (!nameItem) nameItem = form.addTextItem().setTitle('اسم البرنامج').setHelpText('يُعبأ تلقائيًا من منصة المركز.').setRequired(true);
  return { id: idItem, name: nameItem };
}

function buildEvaluationUrl_(program) {
  const form = FormApp.openById(MASTER_EVALUATION_FORM_ID);
  const items = ensureProgramItems_(form);
  return form.createResponse()
    .withItemResponse(items.id.createResponse(String(program.id)))
    .withItemResponse(items.name.createResponse(String(program.name)))
    .toPrefilledUrl();
}

function onGoogleFormSubmit_(e) {
  if (!e || !e.response) throw new Error('لم يتم استلام رد النموذج');
  const responses = e.response.getItemResponses().map(itemResponse => ({
    title: String(itemResponse.getItem().getTitle() || ''),
    normalized: normalizeTitle_(itemResponse.getItem().getTitle()),
    answer: itemResponse.getResponse()
  }));
  const answerFor = aliases => {
    const normalizedAliases = aliases.map(normalizeTitle_);
    const found = responses.find(response => normalizedAliases.some(alias => response.normalized.indexOf(alias) !== -1));
    return found ? found.answer : '';
  };
  let programId = String(answerFor(['معرّف البرنامج','معرف البرنامج','رقم البرنامج']) || '').trim();
  if (!programId) {
    const programName = String(answerFor(['اسم البرنامج','اسم النشاط']) || '').trim();
    const matches = listRows_('Programs', false).filter(program => String(program.name).trim() === programName);
    if (matches.length === 1) programId = matches[0].id;
  }
  if (!programId || !findRowByKey_('Programs', 'id', programId)) throw new Error('تعذر تحديد البرنامج المرتبط بالتقييم');

  const scoreAliases = {
    content: ['الرضا عن المحتوى','المحتوى','محتوى البرنامج'],
    organization: ['الرضا عن التنظيم','التنظيم','تنظيم البرنامج'],
    trainer: ['تقييم المدرب','المدرب','مقدم الجلسة'],
    goals: ['مدى تحقق الأهداف','تحقق الأهداف','الأهداف'],
    benefit: ['الاستفادة المتوقعة','الاستفادة','الفائدة']
  };
  const values = {};
  Object.keys(scoreAliases).forEach(key => values[key] = parseRating_(answerFor(scoreAliases[key])));
  const numericAnswers = responses.map(response => parseRating_(response.answer)).filter(value => value >= 1 && value <= 5);
  let fallbackIndex = 0;
  Object.keys(scoreAliases).forEach(key => {
    if (!values[key]) values[key] = numericAnswers[fallbackIndex] || 0;
    fallbackIndex += 1;
  });
  Object.keys(values).forEach(key => { if (!values[key]) throw new Error('لم يتم العثور على إجابة صحيحة لمحور: ' + key); });

  const timestamp = e.response.getTimestamp ? e.response.getTimestamp() : new Date();
  const responseId = e.response.getId ? e.response.getId() : Utilities.getUuid();
  saveEvaluation_({
    id: 'GFORM-' + responseId,
    programId,
    content: values.content,
    organization: values.organization,
    trainer: values.trainer,
    goals: values.goals,
    benefit: values.benefit,
    strengths: answerFor(['نقاط القوة','أبرز نقاط القوة','ما الذي أعجبك']),
    comment: answerFor(['الملاحظات والمقترحات','الملاحظات','المقترحات','اقتراحاتك']),
    createdAt: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp)
  });
}

function parseRating_(value) {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct >= 1 && direct <= 5) return direct;
  const match = String(value || '').match(/[1-5]/);
  return match ? Number(match[0]) : 0;
}

function normalizeTitle_(value) {
  return String(value || '').toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\u0600-\u06FFa-z0-9]+/g, ' ').trim();
}

function logActivity_(action, details, actor) {
  return appendEntity_('ActivityLog', { id: Utilities.getUuid(), action: String(action || ''), details: String(details || ''), actor: String(actor || Session.getActiveUser().getEmail() || 'النظام'), createdAt: new Date().toISOString() });
}

function listRows_(tableName, includeDeleted) {
  const sheet = sheet_(tableName), keys = TABLES[tableName].keys;
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, keys.length).getValues().map(row => rowToObject_(keys, row)).filter(row => includeDeleted || !row.deletedAt);
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
  const sheet = sheet_(tableName), keys = TABLES[tableName].keys, keyIndex = keys.indexOf(key);
  if (keyIndex < 0 || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, keys.length).getValues();
  for (let i = 0; i < values.length; i++) if (String(values[i][keyIndex]) === String(value)) return { row: i + 2, record: rowToObject_(keys, values[i]) };
  return null;
}

function deleteRowsByProgram_(tableName, programId) {
  const sheet = sheet_(tableName), keys = TABLES[tableName].keys, index = keys.indexOf('programId');
  if (index < 0 || sheet.getLastRow() < 2) return;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, keys.length).getValues();
  for (let i = values.length - 1; i >= 0; i--) if (String(values[i][index]) === String(programId)) sheet.deleteRow(i + 2);
}

function rowToObject_(keys, row) {
  const out = {}; keys.forEach((key, i) => out[key] = normalizeCell_(row[i])); return out;
}

function normalizeCell_(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function numberBetween_(value, min, max) {
  const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) throw new Error('قيمة التقييم غير صحيحة'); return n;
}

function sheet_(tableName) {
  const config = TABLES[tableName]; if (!config) throw new Error('جدول غير معروف');
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(config.title); if (!sheet) throw new Error('الورقة غير موجودة: ' + config.title); return sheet;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
