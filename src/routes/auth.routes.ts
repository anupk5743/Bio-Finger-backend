import { Router } from 'express';
import { login, refresh, logout, getMe, changePassword } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '../validators/auth.validators.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', validateRequest(refreshTokenSchema), refresh);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), changePassword);

export default router;
