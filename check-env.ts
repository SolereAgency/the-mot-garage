import dotenv from 'dotenv';
dotenv.config();

console.log('GOOGLE_CALENDAR_ID:', process.env.GOOGLE_CALENDAR_ID ? 'Configured' : 'Missing');
console.log('GOOGLE_SERVICE_ACCOUNT_BASE64:', process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 ? 'Configured' : 'Missing');
console.log('RETELL_API_KEY:', process.env.RETELL_API_KEY ? 'Configured' : 'Missing');
console.log('RETELL_AGENT_ID:', process.env.RETELL_AGENT_ID ? 'Configured' : 'Missing');
console.log('VITE_RETELL_CHAT_AGENT_ID:', process.env.VITE_RETELL_CHAT_AGENT_ID ? 'Configured' : 'Missing');
console.log('VITE_RETELL_PUBLIC_KEY:', process.env.VITE_RETELL_PUBLIC_KEY ? 'Configured' : 'Missing');
