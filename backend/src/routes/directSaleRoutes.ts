import express, { Router } from 'express'
import {
  createDirectSale,
  getDirectSales,
  getClientOptions,
  markDirectSaleDirectHire,
  markDirectSaleInterested,
  markDirectSaleRejected,
} from '../controllers/directSaleController'

const router: Router = express.Router()

router.get('/', getDirectSales)
router.get('/clients', getClientOptions)
router.post('/', createDirectSale)
router.post('/:referenceCode', createDirectSale)
router.patch('/:id/interested', markDirectSaleInterested)
router.patch('/:id/direct-hire', markDirectSaleDirectHire)
router.patch('/:id/reject', markDirectSaleRejected)

export default router
