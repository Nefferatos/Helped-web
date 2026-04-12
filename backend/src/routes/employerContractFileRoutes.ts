import express, { Router } from 'express'
import {
  deleteEmployerContractFile,
  downloadEmployerContractFile,
  listEmployerContractFiles,
  uploadEmployerContractFiles,
  viewEmployerContractFile,
} from '../controllers/employerContractFileController'

const router: Router = express.Router()

router.use(express.raw({ type: 'multipart/form-data', limit: '25mb' }))
router.get('/', listEmployerContractFiles)
router.post('/', uploadEmployerContractFiles)
router.get('/:id/view', viewEmployerContractFile)
router.get('/:id/download', downloadEmployerContractFile)
router.delete('/:id', deleteEmployerContractFile)

export default router

