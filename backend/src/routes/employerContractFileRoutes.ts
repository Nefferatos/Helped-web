import express, { Router } from 'express'
import {
  deleteEmployerContractFile,
  downloadEmployerContractFile,
  listEmployerContractFiles,
  uploadEmployerContractFiles,
} from '../controllers/employerContractFileController'

const router: Router = express.Router()

router.get('/', listEmployerContractFiles)
router.post('/', uploadEmployerContractFiles)
router.get('/:id/download', downloadEmployerContractFile)
router.delete('/:id', deleteEmployerContractFile)

export default router

