import { Router } from 'express';
import {
  getUnits, getUnit, createUnit, updateUnit, toggleUnitActive, deleteUnit
} from '../controllers/units.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getUnits);
router.get('/:id', getUnit);
router.post('/', authorize('ADMIN'), createUnit);
router.put('/:id', authorize('ADMIN'), updateUnit);
router.patch('/:id/toggle-active', authorize('ADMIN'), toggleUnitActive);
router.delete('/:id', authorize('ADMIN'), deleteUnit);

export default router;
