import express, { Router } from 'express'
import {
  getClientMe,
  loginClient,
  logoutClient,
  registerClient,
} from '../controllers/clientAuthController'

const router: Router = express.Router()

router.post('/register', registerClient)
router.post('/login', loginClient)
router.get('/me', getClientMe)
router.post('/logout', logoutClient)

export default router
