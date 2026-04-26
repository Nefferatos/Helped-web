import express, { Router } from 'express'
import { listAgencies } from '../controllers/agencyDirectoryController'

const router: Router = express.Router()

router.get('/', listAgencies)

export default router
