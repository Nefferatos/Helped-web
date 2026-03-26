import express, { Router } from 'express'
import {
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

export default router
