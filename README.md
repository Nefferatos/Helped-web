# Helped - Full Stack Web Application

A modern full-stack web application with React + TypeScript frontend and Node.js/Express backend.

## Project Structure

```
├── frontend/          # React + TypeScript application (Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/           # Node.js/Express API server
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+ and npm/yarn
- Git

### Installation

1. **Clone or setup the project**
   ```bash
   cd helped-web
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

### Development

Run both frontend and backend in separate terminals:

**Terminal 1 - Backend (runs on port 3000)**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend (runs on port 5173)**
```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

The frontend is configured to proxy API calls from `/api` to the backend server.

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

**Backend:**
```bash
cd backend
npm run build
npm start
```

For the legacy local full-stack build from repo root, use:

```bash
npm run build:full
```

## Cloudflare Deployment

This project can be deployed as one Cloudflare Worker that serves the built frontend and handles the API on `/api/*`.

The Worker API persists application data to Supabase (as a single `jsonb` blob row in `public.app_data`) when you set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase table setup SQL is in `supabase/app_data.sql`.

## Email Confirmation (Client + Agency Admin Signup)

Signup flows now require email confirmation via a 6-digit code:

- Client: `/api/client-auth/register` -> `/api/client-auth/confirm`
- Agency admin: `/api/agency-auth/register` -> `/api/agency-auth/confirm`

To send emails in the Cloudflare Worker deployment, configure Resend:

- Set `RESEND_FROM` under `[vars]` in `wrangler.toml`
- Set the secret (do not commit it):

```bash
npx wrangler secret put RESEND_API_KEY
```

Dev-only fallback: set `DEV_EXPOSE_CONFIRMATION_CODE=true` to return the code in JSON responses (never enable in production).

## Supabase Social + Phone Login (Client Portal)

The client login page (`/employer-login`) supports:

- Google OAuth (`supabase.auth.signInWithOAuth({ provider: "google" })`)
- Facebook OAuth (`supabase.auth.signInWithOAuth({ provider: "facebook" })`)
- Phone OTP via SMS (`supabase.auth.signInWithOtp` + `supabase.auth.verifyOtp`)

Setup steps in Supabase Dashboard:

1. Enable providers: Authentication → Providers → enable Google and/or Facebook.
2. Add redirect URL: Authentication → URL Configuration → add `https://<your-domain>/auth/callback`.
3. Enable Phone: Authentication → Providers → Phone, and configure an SMS provider (Twilio, etc.).

Worker/Backend requirements:

- The API accepts Supabase JWTs by calling `GET <SUPABASE_URL>/auth/v1/user` using `SUPABASE_ANON_KEY`.
- Set `SUPABASE_ANON_KEY` in `wrangler.toml` (or `.dev.vars` for local `wrangler dev`).

## App Details

This application currently includes three main portal flows:

- User portal:
  Employer login, client dashboard, client profile, assigned maids, history, and client support chat.
- Agency portal:
  Public agency listing and agency detail pages for browsing agencies and available maids.
- Agency admin portal:
  Admin login, dashboard, agency profile management, maid management, enquiries, requests, support chat, and employment contracts.

Main live routes:

- `/` - Main landing page
- `/employer-login` - User portal login
- `/agencies` - Agency portal
- `/agencyadmin/login` - Agency admin portal login
- `/agencyadmin/dashboard` - Agency admin dashboard
- `/api/health` - API health check
- `/api/diagnostics` - Deployment diagnostics (storage mode + config presence)

Default seeded admin account:

- Username: `attheagency`
- Password: `@atagency2026`

## Important Data Storage Note

In the Cloudflare Worker deployment, the following app data is stored in Supabase (inside `public.app_data.data`):

- maid records
- user/client accounts
- agency admin accounts
- enquiries
- direct sale requests
- chat messages
- company profile data

Legacy note: `backend/` contains an old Node/Express server and is not used in the Cloudflare Worker deployment.

## Beginner Troubleshooting

### Problem: "I pasted schema.sql into Supabase, but live data is not appearing there"

Reason:

- The Cloudflare Worker deployment uses `supabase/app_data.sql` (a single `jsonb` blob row), not `backend/schema.sql`.

What to do:

- Run `supabase/app_data.sql` in the Supabase SQL editor.
- Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and redeploy.

### Problem: "I updated the site but changes are not showing live"

Use:

```bash
npm run deploy:cf
```

Then hard refresh your browser with `Ctrl + F5`, or open the site in an Incognito window.

### Problem: "The page route opens the wrong portal"

Check these live routes:

- User portal login: `/employer-login`
- Agency portal: `/agencies`
- Agency admin login: `/agencyadmin/login`

If the wrong page still opens:

1. Hard refresh with `Ctrl + F5`
2. Try Incognito mode
3. Redeploy with:

```bash
npm run deploy:cf
```

### Problem: "Worker API says Supabase read/write failed"

Common causes:

- `SUPABASE_URL` is wrong (it must look like `https://<project-ref>.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` is missing/incorrect
- You did not run `supabase/app_data.sql` yet

### Problem: "Wrangler gives login, auth, or permission errors"

Try:

```bash
npx wrangler login
```

If PowerShell blocks a global Wrangler script, prefer:

```bash
npx wrangler ...
```

instead of calling `wrangler` directly.

## Supabase + Cloudflare Worker Setup

### 1. Create the Supabase table

Run `supabase/app_data.sql` in the Supabase SQL editor.

### 2. Configure Wrangler secrets/vars

- Set `SUPABASE_URL` in `wrangler.toml` under `[vars]`.
- Set the secret (do not commit it):

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### 3. Run locally with Wrangler

Copy `.dev.vars.example` to `.dev.vars`, then run:

```bash
npm run worker:dev
```

### 4. Deploy to Cloudflare

```bash
npm run deploy:cf
```

After deploy, the SPA is served from `frontend/dist` and the backend runs inside the same Worker.

## Updating The Live Server

After you change the website locally, update the live Cloudflare site with:

```bash
npm run deploy:cf
```

That command:

- builds the frontend
- deploys the Worker code
- uploads updated static assets to Cloudflare

Recommended update flow:

1. Edit the code locally.
2. Test locally if needed.
3. Deploy live:

```bash
npm run deploy:cf
```

If you change KV data and want the live site to use the new data, upload it with:
Data is persisted in Supabase, so redeploying does not reset it.

## Available Scripts

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run compiled server
- `npm run lint` - Run ESLint

## Features

### Frontend
- ⚛️ React 18
- 📘 TypeScript
- ⚡ Vite (fast build tool)
- 🎨 Modern CSS support
- 📦 ESLint for code quality

### Backend
- 🚀 Express.js
- 📘 TypeScript
- 🔄 Hot reload in development (ts-node-dev)
- 🛡️ CORS enabled
- 📋 ESLint for code quality

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Server health check
- `GET /api/data` - Sample data endpoint

## Environment Variables

### Backend
Create a `.env` file in the backend directory:

```bash
PORT=3000
NODE_ENV=development
```

See `.env.example` for reference.

## Next Steps

1. Customize the frontend components in `frontend/src/`
2. Build out your API endpoints in `backend/src/server.ts`
3. Add database integration (MongoDB, PostgreSQL, etc.)
4. Implement authentication/authorization
5. Add environment-specific configurations

## License

ISC
