import express, { Router } from 'express'
import {
  deleteEmployerContractFile,
  downloadEmployerContractFile,
  listEmployerContractFiles,
  uploadEmployerContractFiles,
  viewEmployerContractFile,
} from '../controllers/employerContractFileController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()
const canReviewDocuments = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff', 'DOCUMENT_REVIEWER')
const canManageDocuments = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff', 'DOCUMENT_REVIEWER')

router.get('/', requireAgencyAuth, canReviewDocuments, listEmployerContractFiles)
router.post('/', requireAgencyAuth, canManageDocuments, uploadEmployerContractFiles)
router.get('/:id/view', requireAgencyAuth, canReviewDocuments, viewEmployerContractFile)
router.get('/:id/download', requireAgencyAuth, canReviewDocuments, downloadEmployerContractFile)
router.delete('/:id', requireAgencyAuth, requireAgencyRole('SUPER_ADMIN', 'admin', 'agency'), deleteEmployerContractFile)

export default router
