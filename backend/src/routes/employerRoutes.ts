import express, { Router } from 'express'
import {
  deleteEmployerContract,
  getEmployerContract,
  listEmployerContracts,
  saveEmployerContract,
} from '../controllers/employerController'

const router: Router = express.Router()

router.get('/', listEmployerContracts)
router.get('/:refCode', getEmployerContract)
router.post('/', saveEmployerContract)
router.delete('/:refCode', deleteEmployerContract)

export default router
