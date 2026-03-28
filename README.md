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

Important:
`backend/schema.sql` and `DATABASE_URL` are for the legacy Node/Express backend. The Cloudflare deployment path in this repo does not read Supabase/Postgres. It stores app data in the `APP_DATA` Cloudflare KV namespace.

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

Default seeded admin account:

- Username: `admin`
- Password: `admin123`

## Important Data Storage Note

Important for beginners:

- The current live Cloudflare deployment does **not** save application data to Supabase.
- The current live Cloudflare deployment saves application data to **Cloudflare KV** through the Worker in [functions/api/[[...path]].ts](c:\hb\Helped-web\functions\api\[[...path]].ts).

That means the following data is currently stored in Cloudflare KV, not Supabase:

- maid records
- user/client accounts
- agency admin accounts
- enquiries
- direct sale requests
- chat messages
- company profile data

Files related to the old Supabase/Postgres path:

- [backend/schema.sql](c:\hb\Helped-web\backend\schema.sql)
- [backend/src/db.ts](c:\hb\Helped-web\backend\src\db.ts)
- [backend/src/server.ts](c:\hb\Helped-web\backend\src\server.ts)

These backend files are part of the legacy Node/Express setup and are **not** used by the current live Cloudflare Worker deployment.

Simple answer:

- If you add a maid on the live site now, it is saved to Cloudflare KV.
- If you create a user account on the live site now, it is saved to Cloudflare KV.
- If you submit other app data on the live site now, it is saved to Cloudflare KV.
- It is **not** automatically saved to Supabase.

## If You Want Data Stored In Supabase

If your goal is:

- every maid
- every user account
- every request
- every enquiry
- every chat
- every profile change

to be stored in Supabase, then the live backend must be changed from Cloudflare KV storage to Supabase/Postgres storage.

This is a separate migration task. It has not been done yet in the current live deployment.

## Beginner Troubleshooting

### Problem: "I pasted schema.sql into Supabase, but live data is not appearing there"

Reason:

- The live Worker is not using Supabase right now.
- It is using Cloudflare KV.

What to do:

- Do not expect new live data to appear in Supabase yet.
- If you want that behavior, migrate the Worker API to Supabase first.

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

### Problem: "I changed local app data and want the live KV data updated"

Use:

```bash
npx wrangler kv key put "app-data.json" --binding APP_DATA --path backend\data\app-data.json --preview false
```

Then redeploy if needed:

```bash
npm run deploy:cf
```

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

## Recommended Next Step If You Want Supabase

If you want all live app data to be stored in Supabase, the recommended next task is:

- migrate the live Cloudflare Worker backend from KV to Supabase/Postgres for all app data

### 1. Build the frontend assets

```bash
npm run frontend:build
```

### 2. Create the KV namespace

```bash
npm run kv:create
```

Put the returned KV ids into [wrangler.toml](c:\hb\Helped-web\wrangler.toml) for `id` and `preview_id`.

### 3. Seed the KV data

```bash
npm run kv:migrate
```

Replace `APP_DATA_ID` in that command with the real namespace id if needed.

### 4. Run locally with Wrangler

```bash
npm run worker:dev
```

### 5. Deploy to Cloudflare

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

```bash
npx wrangler kv key put "app-data.json" --binding APP_DATA --path backend\data\app-data.json --preview false
```

Then redeploy if needed:

```bash
npm run deploy:cf
```

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
