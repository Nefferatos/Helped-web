import express, { Router } from 'express'
import {
  confirmClientEmail,
  getClientMe,
  loginClient,
  logoutClient,
  registerClient,
  resendClientEmailConfirmation,
  updateClientMe,
} from '../controllers/clientAuthController'

const router: Router = express.Router()

router.post('/register', registerClient)
router.post('/login', loginClient)
router.post('/confirm', confirmClientEmail)
router.post('/resend', resendClientEmailConfirmation)
router.get('/me', getClientMe)
router.put('/me', updateClientMe)
router.post('/logout', logoutClient)

export default router
