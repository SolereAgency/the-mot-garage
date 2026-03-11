import dotenv from 'dotenv';
dotenv.config();

const keys = [
  'GEMINI_API_KEY',
  'APP_URL',
  'RETELL_API_KEY',
  'RETELL_AGENT_ID',
  'VITE_RETELL_CHAT_AGENT_ID',
  'VITE_RETELL_PUBLIC_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'DVLA_API_KEY',
  'EMAIL_USER',
  'EMAIL_PASS',
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_SERVICE_ACCOUNT_BASE64',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'ADMIN_PASSWORD'
];

console.log('--- Environment Variable Check ---');
keys.forEach(key => {
  const value = process.env[key];
  console.log(`${key}: ${value ? 'PRESENT (' + value.substring(0, 4) + '...)' : 'MISSING'}`);
});
