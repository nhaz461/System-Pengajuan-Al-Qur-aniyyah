import { Router } from 'express';
import {
  getActivities, getActivity, createActivity, updateActivity,
  toggleActivityActive, deleteActivity
} from '../controllers/activities.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getActivities);
router.get('/:id', getActivity);
router.post('/', authorize('ADMIN'), createActivity);
router.put('/:id', authorize('ADMIN'), updateActivity);
router.patch('/:id/toggle-active', authorize('ADMIN'), toggleActivityActive);
router.delete('/:id', authorize('ADMIN'), deleteActivity);

export default router;
