import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { changePassword } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { changePasswordSchema } from '../validators/auth.validators.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/change-password', validateRequest(changePasswordSchema), changePassword);

export default router;
