import { execSync } from 'child_process';
try {
  const logs = execSync('tail -n 50 /root/.npm/_logs/*').toString();
  console.log(logs);
} catch (e) {
  console.log('No logs found');
}
