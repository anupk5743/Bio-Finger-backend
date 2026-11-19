import { Router } from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  updateBatchStatus,
  deleteBatch,
} from '../controllers/batch.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createBatchSchema,
  updateBatchSchema,
  updateBatchStatusSchema,
} from '../validators/batch.validators.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getBatches);
router.get('/:id', getBatchById);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(createBatchSchema), createBatch);
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(updateBatchSchema), updateBatch);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), validateRequest(updateBatchStatusSchema), updateBatchStatus);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteBatch);

export default router;
