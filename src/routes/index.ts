import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import batchRoutes from './batch.routes.js';
import studentRoutes from './student.routes.js';
import fingerprintRoutes from './fingerprint.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import profileRoutes from './profile.routes.js';
import exportRoutes from './export.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/batches', batchRoutes);
router.use('/students', studentRoutes);
router.use('/fingerprints', fingerprintRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/exports', exportRoutes);

export default router;
