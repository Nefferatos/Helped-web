import 'dotenv/config'

import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import companyRoutes from './routes/companyRoutes'
import maidRoutes from './routes/maidRoutes'
import enquiryRoutes from './routes/enquiryRoutes'
import directSaleRoutes from './routes/directSaleRoutes'
import requestRoutes from './routes/requestRoutes'
import requestConversationRoutes from './routes/requestConversationRoutes'
import requestMessageRoutes from './routes/requestMessageRoutes'
import clientAuthRoutes from './routes/clientAuthRoutes'
import agencyAuthRoutes from './routes/agencyAuthRoutes'
import agencyRoutes from './routes/agencyRoutes'
import agencyDirectoryRoutes from './routes/agencyDirectoryRoutes'
import clientRoutes from './routes/clientRoutes'
import chatRoutes from './routes/chatRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import employerRoutes from './routes/employerRoutes'
import employerContractFileRoutes from './routes/employerContractFileRoutes'
import leadWorkflowRoutes from './routes/leadWorkflowRoutes'
import inquiryWorkflowRoutes from './routes/inquiryWorkflowRoutes'
import matchingWorkflowRoutes from './routes/matchingWorkflowRoutes'
import automationRoutes from './routes/automationRoutes'
import { initializeDatabase } from './db'
import {
  getAgencyAdminsStore,
  getMaidsStore,
  getStoreDiagnostics,
  initializeStore,
} from './store'
import { syncAgencyAdminsFromStoreRecords } from './repositories/agencyAdminRepository'
import { initializeWorkflowStore } from './store/workflowStore'
import { saveEmployerContract } from './controllers/employerController'

const app: Express = express()
const port = process.env.PORT || 3000
const frontendDist = path.resolve(__dirname, '../../frontend/dist')
const hasFrontendSite = fs.existsSync(frontendDist)

const logOptionalEnv = (key: string) => {
  if (!process.env[key]?.trim()) {
    console.warn(
      `[server] Optional environment variable ${key} is missing. Supabase-backed client JWT verification may be unavailable.`
    )
  }
}

logOptionalEnv('SUPABASE_URL')
logOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
)

// ─── Body parsers ─────────────────────────────────────────────────────────────
//
// FIX: The file upload controller (employerContractFileController) reads
// req.body as a raw Buffer to parse multipart/form-data itself.
// express.json() must NOT run first on those routes — it would consume the
// stream and leave req.body as {} making every upload fail silently.
//
// Solution: apply express.raw() specifically on the two file-upload paths
// BEFORE the global express.json() middleware, then let everything else use
// the normal JSON parser.
//
app.use(
  ['/api/employer-files', '/api/employer-contract-files'],
  express.raw({ type: '*/*', limit: '120mb' })
)

// Global JSON + urlencoded parsers for every other route
app.use(express.json({ limit: '120mb' }))
app.use(express.urlencoded({ extended: true, limit: '120mb' }))

// ─── Health / utility endpoints ───────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'Server is running' })
})

app.get('/api/diagnostics', async (_req: Request, res: Response) => {
  try {
    const store = await getStoreDiagnostics()
    res.json({ runtime: 'express', ...store })
  } catch (error) {
    console.error('Error building diagnostics:', error)
    res.status(500).json({ error: 'Failed to load diagnostics' })
  }
})

app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Maid Agency Backend API' })
})

app.get('/api/data', (_req: Request, res: Response) => {
  res.json({
    data: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
  })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/company', companyRoutes)
app.use('/api/maids', maidRoutes)
app.use('/api/enquiries', enquiryRoutes)
app.use('/api/direct-sales', directSaleRoutes)
app.use('/api/direct-sell', directSaleRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/conversations', requestConversationRoutes)
app.use('/api/messages', requestMessageRoutes)
app.use('/api/client-auth', clientAuthRoutes)
app.use('/api/agency-auth', agencyAuthRoutes)
app.use('/api/agency', agencyRoutes)
app.use('/api/agencies', agencyDirectoryRoutes)
app.use('/api/client', clientRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api', dashboardRoutes)
app.use('/api/leads', leadWorkflowRoutes)
app.use('/api/inquiry', inquiryWorkflowRoutes)
app.use('/api', matchingWorkflowRoutes)
app.use('/api', automationRoutes)

// ─── Employer contract routes ─────────────────────────────────────────────────
// Mounted at /api/employers — the router file must use relative paths:
//   GET  /        → listEmployerContracts
//   POST /        → saveEmployerContract
//   GET  /:refCode → getEmployerContract
//   DELETE /:refCode → deleteEmployerContract
app.use('/api/employers', employerRoutes)

// Legacy single-contract endpoint (kept for backwards compat)
app.post('/api/employment-contract', saveEmployerContract)

// ─── Employer file upload routes ──────────────────────────────────────────────
// Mounted at both paths — the router file must use relative paths:
//   GET    /           → listEmployerContractFiles
//   POST   /           → uploadEmployerContractFiles   (multipart — needs raw body)
//   GET    /:id/view   → viewEmployerContractFile
//   GET    /:id/download → downloadEmployerContractFile
//   DELETE /:id        → deleteEmployerContractFile
app.use('/api/employer-contract-files', employerContractFileRoutes)
app.use('/api/employer-files', employerContractFileRoutes)

// ─── Public maids (no auth) ───────────────────────────────────────────────────
app.get('/api/public-maids', async (_req: Request, res: Response) => {
  try {
    const maids = await getMaidsStore(undefined, 'public')
    res.status(200).json({ maids })
  } catch (error) {
    console.error('Error fetching public maids:', error)
    res.status(500).json({ error: 'Failed to fetch public maids' })
  }
})

// ─── Frontend SPA catch-all ───────────────────────────────────────────────────
if (hasFrontendSite) {
  app.use(express.static(frontendDist))
  app.get(/^(?!\/api(?:\/|$)).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// ─── Error handler ────────────────────────────────────────────────────────────
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (
    err &&
    typeof err === 'object' &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    return res.status(413).json({
      error: 'Payload too large. Please upload a smaller file.',
    })
  }

  if (
    err &&
    typeof err === 'object' &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
}
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await initializeStore()
    await initializeDatabase()
    await syncAgencyAdminsFromStoreRecords(await getAgencyAdminsStore())
    await initializeWorkflowStore()

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

void startServer()