import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env, isProd } from './env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { booksRouter } from './modules/books/books.routes';
import { loansRouter } from './modules/loans/loans.routes';
import { waitlistRouter } from './modules/waitlist/waitlist.routes';
import { activityRouter } from './modules/activity/activity.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { notificationsRouter } from './modules/notifications.routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // Railway sits behind a proxy
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  // In production the API serves the built client from the same origin, so
  // CORS is only needed for the Vite dev server.
  if (!isProd) {
    app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: false }));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/books', booksRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/waitlist', waitlistRouter);
  app.use('/api/activities', activityRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', notFoundHandler);

  // --- Serve the React build (single-service deployment) ------------------
  if (env.SERVE_CLIENT) {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    const indexHtml = path.join(clientDist, 'index.html');

    if (fs.existsSync(indexHtml)) {
      app.use(express.static(clientDist, { maxAge: isProd ? '1y' : 0, index: false }));
      app.get('*', (_req, res) => res.sendFile(indexHtml));
    } else if (isProd) {
      logger.warn(`No client build found at ${clientDist}. Run "npm run build" first.`);
    }
  }

  app.use(errorHandler);
  return app;
}
