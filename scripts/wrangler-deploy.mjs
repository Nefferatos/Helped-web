/**
 * Wrapper that unsets stale CLOUDFLARE_API_TOKEN before running wrangler deploy.
 * This avoids the "Invalid access token" error caused by a stale env var
 * overriding valid OAuth credentials from `wrangler login`.
 *
 * Usage: node scripts/wrangler-deploy.mjs [args...]
 */
import { execSync } from "child_process";

// Remove stale token so Wrangler uses OAuth from wrangler login
delete process.env.CLOUDFLARE_API_TOKEN;

const args = process.argv.slice(2).join(" ");
const cmd = `npx wrangler deploy ${args}`;

console.log(`Running: ${cmd}`);
try {
  execSync(cmd, {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: "inherit",
  });
} catch (e) {
  process.exit(e.status || 1);
}