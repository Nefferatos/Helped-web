import express, { Router } from 'express'
import {
  createAgencyAdminForAgency,
  getAgencyAdminMe,
  loginAgencyAdmin,
  logoutAgencyAdmin,
  registerAgencyAdmin,
} from '../controllers/agencyAuthController'

const router: Router = express.Router()

router.post('/register', registerAgencyAdmin)
router.post('/login', loginAgencyAdmin)
router.get('/me', getAgencyAdminMe)
router.post('/logout', logoutAgencyAdmin)
router.post('/admins', createAgencyAdminForAgency)

export default router
