import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import usersRouter from './users.js';
import partnersRouter from './partners.js';
import paymentsRouter from './payments.js';
import bookingsRouter from './bookings.js';
import reportsRouter from './reports.js';
import auditRouter from './audit.js';
import payoutsRouter from './payouts.js';
import safetyRouter from './safety.js';
import cmsRouter from './cms.js';
import categoriesRouter from './categories.js';
import packagesRouter from './packages.js';
import settingsRouter from './settings.js';
import kycRouter from './kyc.js';
import plansRouter from './plans.js';
import ticketsRouter from './tickets.js';
import { User } from '../../models/User.js';
import { KycSubmission } from '../../models/KycSubmission.js';

const router: Router = Router();

router.use(requireAuth);

router.get('/overview', requireRole('ADMIN'), async (_req: any, res: any) => {
  const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
  const pendingKyc = await KycSubmission.countDocuments({ status: 'PENDING' });
  res.status(200).json({ success: true, data: { activeUsers, pendingKyc } });
});

router.use('/users', requireRole('ADMIN'), usersRouter);
router.use('/partners', requireRole('ADMIN'), partnersRouter);
router.use('/payments', requireRole('ADMIN'), paymentsRouter);
router.use('/bookings', requireRole('ADMIN'), bookingsRouter);
router.use('/reports', requireRole('ADMIN'), reportsRouter);
router.use('/audit', requireRole('ADMIN'), auditRouter);
router.use('/payouts', requireRole('ADMIN'), payoutsRouter);
router.use('/safety', requireRole('ADMIN'), safetyRouter);
router.use('/cms', requireRole('ADMIN'), cmsRouter);
router.use('/categories', categoriesRouter);
router.use('/packages', requireRole('ADMIN'), packagesRouter);
router.use('/settings', settingsRouter);
router.use('/kyc', kycRouter);
router.use('/plans', plansRouter);
router.use('/tickets', requireRole('ADMIN'), ticketsRouter);

export default router;
