/**
 * AAPC website → Google Sheet.
 * Paste this into Extensions → Apps Script on the AAPC Google Sheet, then deploy it as a web app
 * (Execute as: Me, Who has access: Anyone). Put the web app URL in data/site.json → "sheetsEndpoint".
 * Each form type gets its own tab, created automatically with a header row.
 */
const FORMS = {
  suggestions: ['suggestion', 'name', 'email'],
  newsletter: ['email'],
  feedback: ['category', 'rating', 'message', 'name', 'email'],
  'topic-requests': ['topic', 'category', 'details', 'name', 'email']
};
const REQUIRED = { suggestions: 'suggestion', newsletter: 'email', feedback: 'message', 'topic-requests': 'topic' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ error: 'Invalid request.' });
  }
  const fields = FORMS[data.type];
  if (!fields) return reply({ error: 'Unknown form.' });

  const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 2000);
  const values = {};
  fields.forEach((f) => (values[f] = clean(data[f], f === 'email' ? 200 : 2000)));
  if (values[REQUIRED[data.type]].length < (data.type === 'newsletter' ? 1 : 3)) return reply({ error: 'Please fill in the form first.' });
  if (values.email && !EMAIL_RE.test(values.email)) return reply({ error: 'Please enter a valid email address.' });
  if (data.type === 'newsletter') values.email = values.email.toLowerCase();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(data.type);
    if (!sheet) {
      sheet = ss.insertSheet(data.type);
      sheet.appendRow(['timestamp'].concat(fields));
      sheet.setFrozenRows(1);
    }
    if (data.type === 'newsletter') {
      const emails = sheet.getRange(1, 2, sheet.getLastRow(), 1).getValues().map((r) => String(r[0]).toLowerCase());
      if (emails.indexOf(values.email) !== -1) return reply({ ok: true, already: true });
    }
    // Leading ' stops anything a visitor types from being run as a spreadsheet formula.
    const safe = (v) => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date()].concat(fields.map((f) => safe(values[f]))));
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
