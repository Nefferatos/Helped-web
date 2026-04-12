import 'dotenv/config'

import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import companyRoutes from './routes/companyRoutes'
import maidRoutes from './routes/maidRoutes'
import enquiryRoutes from './routes/enquiryRoutes'
import directSaleRoutes from './routes/directSaleRoutes'
import clientAuthRoutes from './routes/clientAuthRoutes'
import agencyAuthRoutes from './routes/agencyAuthRoutes'
import clientRoutes from './routes/clientRoutes'
import chatRoutes from './routes/chatRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import employerRoutes from './routes/employerRoutes'
import employerContractFileRoutes from './routes/employerContractFileRoutes'
import { initializeStore } from './store'

const app: Express = express()
const port = process.env.PORT || 3000
const frontendDist = path.resolve(__dirname, '../../frontend/dist')
const hasFrontendSite = fs.existsSync(frontendDist)

const requireEnv = (key: string) => {
  const value = process.env[key]?.trim()
  if (!value) {
    console.error(`Missing required environment variable: ${key}`)
    process.exit(1)
  }
  return value
}

// Required for Supabase JWT verification and server-side Supabase operations.
requireEnv('SUPABASE_URL')
requireEnv('SUPABASE_SERVICE_ROLE_KEY')

// Middleware
app.use(
  cors({
    origin: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running' })
})

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Maid Agency Backend API' })
})

app.get('/api/data', (req: Request, res: Response) => {
  res.json({
    data: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
  })
})

// Company management routes
app.use('/api/company', companyRoutes)
app.use('/api/maids', maidRoutes)
app.use('/api/enquiries', enquiryRoutes)
app.use('/api/direct-sales', directSaleRoutes)
app.use('/api/direct-sell', directSaleRoutes)
app.use('/api/client-auth', clientAuthRoutes)
app.use('/api/agency-auth', agencyAuthRoutes)
app.use('/api/client', clientRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api', dashboardRoutes)
app.use('/api/employers', employerRoutes)
app.use('/api/employer-contract-files', employerContractFileRoutes)
app.use('/api/employer-files', employerContractFileRoutes)

if (hasFrontendSite) {
  app.use(express.static(frontendDist))
  app.get(/^(?!\/api(?:\/|$)).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
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

const startServer = async () => {
  try {
    await initializeStore()

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

void startServer()
