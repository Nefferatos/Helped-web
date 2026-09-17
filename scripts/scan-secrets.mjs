#!/usr/bin/env node
/**
 * scan-secrets.mjs — dependency-free secret scanner for the Helped-web repo.
 *
 *   node scripts/scan-secrets.mjs              # scan every tracked file
 *   node scripts/scan-secrets.mjs --staged     # scan only what is staged (pre-commit)
 *   node scripts/scan-secrets.mjs --all        # tracked + untracked (ignored files excluded)
 *   node scripts/scan-secrets.mjs --install-hook
 *
 * Enforced automatically by .githooks/pre-commit (`npm run secrets:install-hook`).
 *
 * NOTE: the Supabase *anon* key is public by design (shipped to browsers, enforced
 * by RLS) and is deliberately NOT reported. Only a role=service_role JWT counts as
 * a secret, because it bypasses Row Level Security entirely.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), "..");
const MAX_BYTES = 2 * 1024 * 1024;

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out",
  ".wrangler", ".wrangler-dry", ".vercel",
]);
// The scanner necessarily contains secret-like regex literals; .gitleaks.toml too.
const SKIP_FILES = new Set(["scripts/scan-secrets.mjs", ".gitleaks.toml"]);

// Fast-path: never read binary assets (this repo carries a large uploads folder).
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".avif", ".ico", ".svgz",
  ".pdf", ".xls", ".xlsx", ".doc", ".docx", ".ppt", ".pptx",
  ".zip", ".gz", ".tar", ".7z", ".rar", ".jar",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".mp3", ".mp4", ".mov", ".avi", ".wav",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".sqlite", ".sqlite-wal", ".sqlite-shm", ".db",
]);

const PLACEHOLDER_RE =
  /YOUR_|your-|example|placeholder|redacted|change[_-]?me|dummy|sample|xxxx|<[^>]*webhook-id>|sk-ant-\.\.\.|re_\.\.\./i;

/** High-signal rules. Capture group 1 is the secret value. */
const RULES = [
  {
    id: "supabase-service-role",
    severity: "CRITICAL",
    desc: "Supabase service_role key (bypasses RLS — full database read/write/delete)",
    source: "(eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,})",
    flags: "g",
    keep: (value) => jwtRole(value) === "service_role",
  },
  {
    id: "api-key-sk",
    severity: "CRITICAL",
    desc: "AI provider API key (sk-/sk_ style)",
    source: "\\b(sk[-_][A-Za-z0-9_-]{30,})",
    flags: "g",
  },
  {
    id: "resend-key",
    severity: "CRITICAL",
    desc: "Resend API key",
    source: "\\b(re_[A-Za-z0-9]{24,})",
    flags: "g",
  },
  {
    id: "make-webhook-url",
    severity: "HIGH",
    desc: "Live Make.com webhook URL (unauthenticated — anyone can trigger the scenario)",
    source: "(https://hook\\.eu1\\.make\\.com/[a-z0-9]{20,})",
    flags: "gi",
  },
  {
    id: "private-key",
    severity: "CRITICAL",
    desc: "Private key block",
    source: "(-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----)",
    flags: "g",
  },
  {
    id: "aws-access-key",
    severity: "CRITICAL",
    desc: "AWS access key id",
    source: "\\b(AKIA[0-9A-Z]{16})\\b",
    flags: "g",
  },
  {
    id: "github-token",
    severity: "CRITICAL",
    desc: "GitHub token",
    source: "\\b((?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})\\b",
    flags: "g",
  },
  {
    id: "google-api-key",
    severity: "HIGH",
    desc: "Google API key",
    source: "\\b(AIza[0-9A-Za-z_-]{35})\\b",
    flags: "g",
  },
  {
    id: "slack-token",
    severity: "HIGH",
    desc: "Slack token",
    source: "\\b(xox[baprs]-[A-Za-z0-9-]{10,})\\b",
    flags: "g",
  },
  {
    id: "stripe-live-key",
    severity: "CRITICAL",
    desc: "Stripe live key",
    source: "\\b((?:sk|rk)_live_[A-Za-z0-9]{20,})\\b",
    flags: "g",
  },
];
/** `NAME=value` / `"name": "value"` where NAME looks sensitive and value is a literal token. */
const KEYED_RE =
  /^\s*(?:export\s+)?["']?([A-Za-z0-9_]+)["']?\s*[:=]\s*["']?([A-Za-z0-9_\-+/=]{28,})["']?/;
const SENSITIVE_NAME_RE =
  /(SECRET|PASSWORD|PASSWD|TOKEN|API[_-]?KEY|PRIVATE[_-]?KEY|SERVICE[_-]?ROLE|WEBHOOK[_-]?(?:URL|TOKEN)|_KEY)$/i;
const HASH_VALUE_RE = /^\$2[aby]\$|^[a-f0-9]{32,}$/i;

const jwtRole = (token) => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
};

const mask = (value) =>
  value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;

/** A JWT-shaped value that is truncated, or is not service_role, is fine here. */
const ignoreJwtLike = (value) => {
  if (!value.startsWith("eyJ")) return false;
  if (value.split(".").length !== 3) return true; // truncated doc example
  return jwtRole(value) !== "service_role";
};

function scanText(file, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const seen = new Set();

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    const push = (rule, value) => {
      // De-duplicate by value+line: two rules matching the same token is one finding.
      const key = `${lineNo}:${value}`;
      if (seen.has(key)) return;
      seen.add(key);
      findings.push({
        file,
        line: lineNo,
        id: rule.id,
        severity: rule.severity,
        desc: rule.desc,
        value,
      });
    };

    for (const rule of RULES) {
      const re = new RegExp(rule.source, rule.flags);
      for (const match of line.matchAll(re)) {
        const value = match[1] ?? match[0];
        if (!value || PLACEHOLDER_RE.test(value)) continue;
        if (rule.keep && !rule.keep(value)) continue;
        if (ignoreJwtLike(value)) continue;
        push(rule, value);
      }
    }

    const keyed = line.match(KEYED_RE);
    if (keyed) {
      const name = keyed[1];
      const value = keyed[2];
      if (
        SENSITIVE_NAME_RE.test(name) &&
        !PLACEHOLDER_RE.test(value) &&
        !HASH_VALUE_RE.test(value) &&
        !ignoreJwtLike(value)
      ) {
        push(
          {
            id: "keyed-secret",
            severity: "HIGH",
            desc: `Secret-looking value assigned to ${name}`,
          },
          value,
        );
      }
    }
  });

  return findings;
}
function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

function listFiles(mode) {
  const args =
    mode === "staged"
      ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
      : mode === "all"
        ? ["ls-files", "--cached", "--others", "--exclude-standard"]
        : ["ls-files"];
  const out = git(args).trim();
  return out
    ? out.split("\n").map((f) => f.trim()).filter(Boolean)
    : [];
}

function readContent(rel, mode) {
  if (mode === "staged") {
    // Scan exactly the blob that is about to be committed.
    try {
      return execFileSync("git", ["show", `:${rel}`], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: MAX_BYTES * 2,
      });
    } catch {
      return null;
    }
  }
  try {
    const abs = path.join(ROOT, rel);
    const stat = fs.statSync(abs);
    if (!stat.isFile() || stat.size > MAX_BYTES) return null;
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--install-hook")) {
    git(["config", "core.hooksPath", ".githooks"]);
    console.log("✅ Pre-commit secret hook installed (core.hooksPath = .githooks).");
    return 0;
  }

  const mode = args.includes("--staged")
    ? "staged"
    : args.includes("--all")
      ? "all"
      : "tracked";
  const label = {
    tracked: "tracked file(s)",
    staged: "staged change(s)",
    all: "tracked + untracked file(s)",
  }[mode];

  let files;
  try {
    files = listFiles(mode);
  } catch {
    console.error("❌ Could not list files — is this a git repository?");
    return 2;
  }

  const findings = [];
  let scanned = 0;

  for (const rel of files) {
    const normalised = rel.replace(/\\/g, "/");
    if (SKIP_FILES.has(normalised)) continue;
    if (normalised.split("/").some((part) => SKIP_DIRS.has(part))) continue;
    if (BINARY_EXT.has(path.extname(normalised).toLowerCase())) continue;

    const content = readContent(normalised, mode);
    if (content === null || content === "") continue;
    if (content.includes("\u0000")) continue; // binary

    scanned++;
    findings.push(...scanText(normalised, content));
  }

  if (findings.length === 0) {
    console.log(`✅ No secrets found — scanned ${scanned} ${label}.`);
    return 0;
  }

  console.error(`\n🚨 ${findings.length} potential secret(s) found:\n`);
  for (const f of findings) {
    console.error(`  [${f.severity}] ${f.file}:${f.line}`);
    console.error(`      ${f.desc}`);
    console.error(`      value: ${mask(f.value)}\n`);
  }
  console.error("Fix: keep the value in the gitignored .dev.vars / .env only, use a");
  console.error("Worker secret in production (`npx wrangler secret put NAME`), and rotate");
  console.error("it if it was ever committed. Bypass a hook once with: git commit --no-verify\n");
  return 1;
}

process.exit(main());

