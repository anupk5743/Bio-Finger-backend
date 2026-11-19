import { Router } from 'express';
import { exportStudents, exportBatches, exportUsers } from '../controllers/export.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/students', exportStudents);
router.get('/batches', exportBatches);
router.get('/users', requireRole('SUPER_ADMIN', 'ADMIN'), exportUsers);

export default router;
