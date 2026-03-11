import dotenv from 'dotenv';
dotenv.config();

console.log('--- Environment Variable Check ---');
for (const key in process.env) {
  if (key.includes('RETELL') || key.includes('API') || key.includes('KEY') || key.includes('AGENT')) {
    const value = process.env[key];
    console.log(`${key}: ${value ? 'PRESENT (' + value.substring(0, 4) + '...)' : 'MISSING'}`);
  }
}
