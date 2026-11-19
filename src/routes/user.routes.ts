import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getRoles,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  updateRoleSchema,
} from '../validators/user.validators.js';

const router = Router();

router.use(authenticateToken);

router.get('/roles', requireRole('SUPER_ADMIN', 'ADMIN'), getRoles);
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), getUsers);
router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), getUserById);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(createUserSchema), createUser);
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(updateUserSchema), updateUser);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(updateStatusSchema), updateUserStatus);
router.patch('/:id/role', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(updateRoleSchema), updateUserRole);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteUser);

export default router;
