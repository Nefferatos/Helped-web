import express, { Router } from 'express'
import { tellFriend } from '../controllers/shareController'
import { createRateLimit } from '../middleware/rateLimit'

const router: Router = express.Router()
const tellFriendRateLimit = createRateLimit({
  keyPrefix: 'tell-friend',
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
})

// REMOVED: router.use(express.json({ limit: '16kb' }))
// Reason: server.ts already applies global express.json().
// Having it twice in production causes the body stream to be
// consumed before the controller reads req.body → body is always {}.

router.post('/tell-friend', tellFriendRateLimit, tellFriend)

export default router
