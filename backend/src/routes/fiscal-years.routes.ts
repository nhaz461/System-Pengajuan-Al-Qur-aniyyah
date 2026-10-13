import { Router } from 'express';
import {
  getFiscalYears, getActiveFiscalYear, createFiscalYear,
  setActiveFiscalYear, updateFiscalYear, deleteFiscalYear
} from '../controllers/fiscal-years.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getFiscalYears);
router.get('/active', getActiveFiscalYear);
router.post('/', authorize('ADMIN'), createFiscalYear);
router.put('/:id', authorize('ADMIN'), updateFiscalYear);
router.patch('/:id/set-active', authorize('ADMIN'), setActiveFiscalYear);
router.delete('/:id', authorize('ADMIN'), deleteFiscalYear);

export default router;
