import express, { Router } from 'express'
import {
  deleteEmployerContract,
  getEmployerContract,
  listEmployerContracts,
  saveEmployerContract,
} from '../controllers/employerController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()
const canViewEmployerContracts = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff', 'DOCUMENT_REVIEWER')
const canManageEmployerContracts = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff')

router.get('/', requireAgencyAuth, canViewEmployerContracts, listEmployerContracts)
router.get('/:refCode', requireAgencyAuth, canViewEmployerContracts, getEmployerContract)
router.post('/', requireAgencyAuth, canManageEmployerContracts, saveEmployerContract)
router.delete('/:refCode', requireAgencyAuth, requireAgencyRole('SUPER_ADMIN', 'admin', 'agency'), deleteEmployerContract)

export default router
