const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const { generateSampleExcel } = require('./utils/sampleData');
const path = require('path');
const fs = require('fs');

let retryCount = 0;
const MAX_RETRIES = 5;

const startServer = async () => {
  try {
    // 1. Connect to Database (real or in-memory fallback)
    await connectDB();

    // 2. Ensure sample supermarket dataset exists
    const samplePath = path.resolve(__dirname, '../../sample-data/supermarket_sales_ai_analyzer.xlsx');
    if (!fs.existsSync(samplePath)) {
      try {
        generateSampleExcel(samplePath);
      } catch (e) {
        // ignore
      }
    }

    // 3. Listen on port with auto-retry for port release
    const listen = () => {
      const server = app.listen(env.PORT, () => {
        console.log(`===============================================`);
        console.log(`  InsightAI Backend Server Running!`);
        console.log(`  Mode:        ${env.NODE_ENV}`);
        console.log(`  Port:        ${env.PORT}`);
        console.log(`  API URL:     ${env.SERVER_URL}`);
        console.log(`  Client URL:  ${env.CLIENT_URL}`);
        console.log(`  AI Provider: ${env.AI_API_KEY ? 'Configured' : 'Not configured'}`);
        console.log(`  Google Auth: ${env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
        console.log(`===============================================`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            console.warn(`[Port ${env.PORT} busy] Waiting 1.2s for port to release (attempt ${retryCount}/${MAX_RETRIES})...`);
            setTimeout(listen, 1200);
          } else {
            console.error(`\n[Server Error] Port ${env.PORT} could not be bound after ${MAX_RETRIES} attempts.`);
            console.error(`Please close any existing process on port ${env.PORT}.\n`);
            process.exit(1);
          }
        } else {
          console.error('Server error:', err);
        }
      });

      const gracefulShutdown = () => {
        console.log('\nShutting down server cleanly...');
        server.close(() => {
          process.exit(0);
        });
      };

      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
    };

    listen();
  } catch (err) {
    console.error('Fatal Server Boot Error:', err);
    process.exit(1);
  }
};

startServer();
