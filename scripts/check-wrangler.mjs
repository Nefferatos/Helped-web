// Unset CLOUDFLARE_API_TOKEN and run wrangler whoami
delete process.env.CLOUDFLARE_API_TOKEN;
import { execSync } from 'child_process';
try {
  const out = execSync('npx wrangler whoami', {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: 'pipe',
    timeout: 30000,
  });
  console.log(out.toString());
} catch (e) {
  console.log(e.stdout?.toString() || '');
  console.error(e.stderr?.toString() || e.message);
}