import { Router } from 'express';
import {
  getUsers, createUser, updateUser, toggleUserActive, resetPassword
} from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/toggle-active', toggleUserActive);
router.patch('/:id/reset-password', resetPassword);

export default router;
