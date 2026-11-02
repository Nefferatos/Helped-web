import express, { Router } from 'express'
import {
  addMaidPhoto,
  bringMaidToTop,
  createMaid,
  deleteMaid,
  exportMaidsCsv,
  exportMaidsXls,
  importMaidsBatch,
  getMaidByReferenceCode,
  getMaidAuthenticatedPhoto,
  getMaidOriginalPhoto,
  getMaidPhotoPreview,
  getMaidList,
  getMaidPhotosBatch,
  importMaidsCsv,
  replaceMaidPhotos,
  updateMaid,
  updateMaidPhoto,
  updateMaidVideo,
  updateMaidVisibility,
} from '../controllers/maidController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()
const canManageMaidProfiles = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff')
const canManageMaidVisibility = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency')

router.get('/', getMaidList)
router.get('/export.csv', requireAgencyAuth, canManageMaidProfiles, exportMaidsCsv)
router.get('/export.xls', requireAgencyAuth, canManageMaidProfiles, exportMaidsXls)
router.post('/import.batch', requireAgencyAuth, canManageMaidProfiles, importMaidsBatch)
router.post('/import.csv', requireAgencyAuth, canManageMaidProfiles, importMaidsCsv)
router.post('/photos-batch', getMaidPhotosBatch)
router.get('/:referenceCode/photo-authenticated', getMaidAuthenticatedPhoto)
router.get('/:referenceCode/photo-preview', getMaidPhotoPreview)
router.get('/:referenceCode/photo-original', getMaidOriginalPhoto)
router.patch('/:referenceCode/bring-to-top', requireAgencyAuth, canManageMaidProfiles, bringMaidToTop)
router.get('/:referenceCode', getMaidByReferenceCode)
router.post('/', requireAgencyAuth, canManageMaidProfiles, createMaid)
router.put('/:referenceCode', requireAgencyAuth, canManageMaidProfiles, updateMaid)
router.patch('/:referenceCode/visibility', requireAgencyAuth, canManageMaidVisibility, updateMaidVisibility)
router.patch('/:referenceCode/photo', requireAgencyAuth, canManageMaidProfiles, updateMaidPhoto)
router.patch('/:referenceCode/photos', requireAgencyAuth, canManageMaidProfiles, addMaidPhoto)
router.put('/:referenceCode/photo-gallery', requireAgencyAuth, canManageMaidProfiles, replaceMaidPhotos)
router.patch('/:referenceCode/video', requireAgencyAuth, canManageMaidProfiles, updateMaidVideo)
router.delete('/:referenceCode', requireAgencyAuth, requireAgencyRole('SUPER_ADMIN', 'admin', 'agency'), deleteMaid)

export default router
