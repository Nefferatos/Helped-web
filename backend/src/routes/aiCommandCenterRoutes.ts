import express from 'express'
import { commandCenterRateLimit, requireCommandCenterAdmin } from '../middleware/requireCommandCenterAdmin'
import { getExecutions, makeExecutionCallback, pendingActions, prepareAction, reviewAction, streamExecutions } from '../controllers/aiCommandCenterController'

const router = express.Router()
router.post('/callbacks/make', commandCenterRateLimit, makeExecutionCallback)
router.use(commandCenterRateLimit, requireCommandCenterAdmin)
router.get('/actions/pending', pendingActions)
router.get('/executions', getExecutions)
router.get('/executions/events', streamExecutions)
router.post('/actions', prepareAction)
router.post('/actions/:actionId/review', reviewAction)

export default router
