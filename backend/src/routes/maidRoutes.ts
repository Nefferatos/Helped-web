import express, { Router } from 'express'
import {
  addMaidPhoto,
  createMaid,
  deleteMaid,
  exportMaidsCsv,
  getMaidByReferenceCode,
  getMaidList,
  importMaidsCsv,
  updateMaid,
  updateMaidPhoto,
  updateMaidVideo,
  updateMaidVisibility,
} from '../controllers/maidController'

const router: Router = express.Router()

router.get('/', getMaidList)
router.get('/export.csv', exportMaidsCsv)
router.post('/import.csv', importMaidsCsv)
router.get('/:referenceCode', getMaidByReferenceCode)
router.post('/', createMaid)
router.put('/:referenceCode', updateMaid)
router.patch('/:referenceCode/visibility', updateMaidVisibility)
router.patch('/:referenceCode/photo', updateMaidPhoto)
router.patch('/:referenceCode/photos', addMaidPhoto)
router.patch('/:referenceCode/video', updateMaidVideo)
router.delete('/:referenceCode', deleteMaid)

export default router
