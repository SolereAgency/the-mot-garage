import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

async function testCalendar() {
  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  let calendarId = process.env.GOOGLE_CALENDAR_ID || process.env.EMAIL_USER || 'primary';

  if (!credentialsBase64) {
    console.log('No credentials');
    return;
  }

  const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  const calendar = google.calendar({ version: 'v3', auth });
  
  const startDate = new Date('2026-03-09T00:00:00.000Z');
  const endDate = new Date('2026-03-09T23:59:59.999Z');

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: 'Europe/London',
      items: [{ id: calendarId }]
    }
  });

  console.log(JSON.stringify(freeBusyResponse.data, null, 2));
}

testCalendar();
