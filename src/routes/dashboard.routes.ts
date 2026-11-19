import { Router } from 'express';
import {
  getDashboardSummary,
  getStudentStatistics,
  getBatchStatistics,
  getRecentActivities,
} from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/summary', getDashboardSummary);
router.get('/student-statistics', getStudentStatistics);
router.get('/batch-statistics', getBatchStatistics);
router.get('/recent-activities', getRecentActivities);

export default router;
