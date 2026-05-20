import express, { Router } from 'express'
import {
  addMaidPhoto,
  createMaid,
  deleteMaid,
  exportMaidsCsv,
  exportMaidsXls,
  importMaidsBatch,
  getMaidByReferenceCode,
  getMaidList,
  importMaidsCsv,
  replaceMaidPhotos,
  updateMaid,
  updateMaidPhoto,
  updateMaidVideo,
  updateMaidVisibility,
} from '../controllers/maidController'

const router: Router = express.Router()

router.get('/', getMaidList)
router.get('/export.csv', exportMaidsCsv)
router.get('/export.xls', exportMaidsXls)
router.post('/import.batch', importMaidsBatch)
router.post('/import.csv', importMaidsCsv)
router.get('/:referenceCode', getMaidByReferenceCode)
router.post('/', createMaid)
router.put('/:referenceCode', updateMaid)
router.patch('/:referenceCode/visibility', updateMaidVisibility)
router.patch('/:referenceCode/photo', updateMaidPhoto)
router.patch('/:referenceCode/photos', addMaidPhoto)
router.put('/:referenceCode/photo-gallery', replaceMaidPhotos)
router.patch('/:referenceCode/video', updateMaidVideo)
router.delete('/:referenceCode', deleteMaid)

export default router
