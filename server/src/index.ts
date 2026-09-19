import { env } from './env';
import { logger } from './lib/logger';
import { createApp } from './app';
import { prisma } from './lib/prisma';
import { ensureAdminAccount } from './modules/auth/auth.service';
import { startHoldSweeper, stopHoldSweeper } from './modules/loans/holds.service';

async function main() {
  await prisma.$connect();
  const admin = await ensureAdminAccount();
  logger.info(`Staff account ready: ${admin.username}`);

  startHoldSweeper();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Library API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down.`);
    stopHoldSweeper();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(async (error) => {
  logger.error('Failed to start server', error);
  await prisma.$disconnect();
  process.exit(1);
});
