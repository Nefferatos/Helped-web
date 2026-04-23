import express, { Router } from 'express'
import { createAgencyAdminForAgency } from '../controllers/agencyAuthController'

const router: Router = express.Router()

router.post('/admins', createAgencyAdminForAgency)

export default router
