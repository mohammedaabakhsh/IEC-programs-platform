# Google Sheets API deployment

قاعدة البيانات الرسمية:

`1tQL7hawesc00YbM2ig0rbiinmnhjr3VYOQ3-55Z0DKI`

## خطوات النشر

1. افتح Google Sheet.
2. من القائمة اختر: **Extensions → Apps Script**.
3. احذف محتوى ملف `Code.gs` الموجود داخل Apps Script.
4. انسخ محتوى الملف `google-apps-script/Code.gs` من هذا المستودع والصقه.
5. شغّل الدالة `setupDatabase_` مرة واحدة، ثم وافق على الصلاحيات.
6. اختر: **Deploy → New deployment → Web app**.
7. اجعل **Execute as**: Me.
8. اجعل **Who has access**: Anyone.
9. اضغط Deploy وانسخ رابط Web App الذي ينتهي بـ `/exec`.
10. أرسل الرابط لربطه مع واجهة المنصة.

## اختبار الخدمة

افتح الرابط التالي بعد استبدال `WEB_APP_URL`:

`WEB_APP_URL?action=health`

النتيجة الصحيحة يجب أن تحتوي على:

```json
{
  "ok": true,
  "version": "2.0.1",
  "data": {
    "status": "ready"
  }
}
```

عند أول تشغيل ستُنشأ الأوراق التالية تلقائيًا:

- Programs
- Evaluations
- Attendance
- Users
- ActivityLog
- Settings
- KPI_Goals
