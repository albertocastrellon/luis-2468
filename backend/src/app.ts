import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { paymentRoutes } from './routes/paymentRoutes';

export const app = express();
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.get('/', (_req, res) => res.json({ message: 'Caracol API funcionando.' }));
app.use('/api/auth', authRoutes);
app.use('/api/snailpay', paymentRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
