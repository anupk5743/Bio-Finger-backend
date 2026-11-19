import { Router } from 'express';
import {
  getDeviceStatus,
  getStudentFingerprints,
  enrollFingerprint,
  deleteFingerprint,
} from '../controllers/fingerprint.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { enrollFingerprintSchema } from '../validators/fingerprint.validators.js';

const router = Router();

router.use(authenticateToken);

router.get('/device/status', getDeviceStatus);
router.get('/student/:studentId', getStudentFingerprints);
router.post('/enrollment', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), validateRequest(enrollFingerprintSchema), enrollFingerprint);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteFingerprint);

export default router;
