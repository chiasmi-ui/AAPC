/**
 * AAPC website → Google Sheet.
 * Paste this into Extensions → Apps Script on the AAPC Google Sheet, then deploy it as a web app
 * (Execute as: Me, Who has access: Anyone). Put the web app URL in data/site.json → "sheetsEndpoint".
 * Each form type gets its own tab, created automatically with a header row.
 * New newsletter sign-ups get a welcome email sent from the account that owns this script
 * (aapc.ud@gmail.com). Free Gmail accounts can send about 100 of these a day.
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
  if (data.type === 'newsletter') sendWelcomeEmail(values.email);
  return reply({ ok: true });
}

// The sign-up is already saved by this point, so a mail failure (e.g. daily quota) is only logged.
function sendWelcomeEmail(to) {
  const text = [
    'Hi there!',
    '',
    "Thank you for signing up for the AAPC newsletter. From now on you'll get a newsletter from us every month with new articles, magazine releases and GBM dates.",
    '',
    'In the meantime, follow us on Instagram at @udaapc: https://www.instagram.com/udaapc/',
    '',
    'See you soon,',
    'AAPC (Asian Awareness & Perspective Connections)',
    '',
    "Didn't sign up, or want to stop getting these? Just reply to this email and we'll take you off the list."
  ].join('\n');
  const html =
    '<div style="font-family:Georgia,serif;color:#2b2a26;max-width:520px;line-height:1.6">' +
    '<h2 style="color:#2f5e34;margin:0 0 12px">Welcome to the AAPC newsletter!</h2>' +
    "<p>Thank you for signing up. From now on you'll get a newsletter from us every month with new articles, magazine releases and GBM dates.</p>" +
    '<p>In the meantime, follow us on Instagram at <a href="https://www.instagram.com/udaapc/" style="color:#c25591">@udaapc</a>.</p>' +
    '<p>See you soon,<br>AAPC (Asian Awareness &amp; Perspective Connections)</p>' +
    "<p style=\"font-size:12px;color:#6b675e\">Didn't sign up, or want to stop getting these? Just reply to this email and we'll take you off the list.</p>" +
    '</div>';
  try {
    MailApp.sendEmail({ to: to, subject: 'Welcome to the AAPC newsletter!', body: text, htmlBody: html, name: 'AAPC' });
  } catch (err) {
    console.error('Welcome email to ' + to + ' failed: ' + err);
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
