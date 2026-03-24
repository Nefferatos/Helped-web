import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import cors from 'cors'
import companyRoutes from './routes/companyRoutes'
import maidRoutes from './routes/maidRoutes'
import enquiryRoutes from './routes/enquiryRoutes'
import { initializeStore } from './store'

const app: Express = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Maid Agency Backend API' })
})

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running' })
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

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
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
