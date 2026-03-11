import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    console.log('Calendar ID:', calendarId);
    
    if (!credentialsBase64) throw new Error('No credentials');
    
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);
    console.log('Service Account:', credentials.client_email);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    const res = await calendar.calendars.get({ calendarId: calendarId || 'primary' });
    console.log('Calendar details:', res.data.summary);
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
