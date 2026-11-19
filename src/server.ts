import app from './app.js';
import { config } from './config/index.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Bio Finger Backend running on port ${PORT}`);
  console.log(`🔗 Health check available at: http://localhost:${PORT}${config.apiPrefix}/health`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`=======================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
