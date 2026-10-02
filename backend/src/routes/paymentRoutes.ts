import { Router } from 'express';
import { pay } from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';
import { validatePayment } from '../middleware/validation';

export const paymentRoutes = Router();
paymentRoutes.post('/pay', requireAuth, validatePayment, pay);
