// Loads environment variables for the Express backend from two places.
//
//  1. backend/.env          — backend-only settings (PORT, DATABASE_URL, SMTP_*).
//                             Resolved from the current working directory, which
//                             is backend/ for `npm run dev` / `npm start`.
//  2. <repo-root>/.env      — the gitignored store for the shared API keys and
//                             Make.com webhooks, shared with the Worker/scripts.
//
// Order matters and works in our favour: dotenv never overwrites a variable that
// is already defined, so backend/.env wins for any key it sets and the root .env
// only fills in what is missing.
//
// The root path is resolved from this file (not from cwd) so it behaves the same
// whether we run from src/ via ts-node or from dist/ after `npm run build`:
//   <repo>/backend/{src|dist}/loadRootEnv.ts -> <repo>/.env
import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

export {};
