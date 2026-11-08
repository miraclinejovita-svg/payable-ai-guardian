import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`[PAYABLE GUARDIAN SERVER] Running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[PAYABLE GUARDIAN SERVER] Health check: http://localhost:${env.PORT}/api/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server gracefully.');
  server.close(() => {
    console.log('HTTP server closed.');
  });
});
