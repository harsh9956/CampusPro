/**
 * Utility script to concurrently start API server and background workers in development
 * Usage: npm run dev:all
 */
const { spawn } = require('child_process');

console.log('====================================================');
console.log('🚀 Starting CampusPro Full Stack Backend (API + Workers)');
console.log('====================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

const worker = spawn(npmCmd, ['run', 'worker'], {
  stdio: 'inherit',
  shell: true
});

const handleExit = (signal) => {
  console.log(`\nStopping API and Worker processes (${signal})...`);
  server.kill();
  worker.kill();
  process.exit(0);
};

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));

server.on('close', (code) => {
  console.log(`[API Server] Exited with code ${code}`);
  worker.kill();
  process.exit(code);
});

worker.on('close', (code) => {
  console.log(`[Worker Process] Exited with code ${code}`);
  server.kill();
  process.exit(code);
});
