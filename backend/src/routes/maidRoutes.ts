import express, { Router } from 'express'
import {
  createMaid,
  deleteMaid,
  getMaidByReferenceCode,
  getMaidList,
  updateMaid,
  updateMaidVisibility,
} from '../controllers/maidController'

const router: Router = express.Router()

router.get('/', getMaidList)
router.get('/:referenceCode', getMaidByReferenceCode)
router.post('/', createMaid)
router.put('/:referenceCode', updateMaid)
router.patch('/:referenceCode/visibility', updateMaidVisibility)
router.delete('/:referenceCode', deleteMaid)

export default router
