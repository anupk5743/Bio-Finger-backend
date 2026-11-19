import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus,
  deleteStudent,
} from '../controllers/student.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from '../validators/student.validators.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), validateRequest(createStudentSchema), createStudent);
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), validateRequest(updateStudentSchema), updateStudent);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), validateRequest(updateStudentStatusSchema), updateStudentStatus);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteStudent);

export default router;
