const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = process.env.DYNAMO_ADMIN_PORT ?? '8001';
const endpoint = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
const rootDir = path.resolve(__dirname, '..');

const adminBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'dynamodb-admin.cmd' : 'dynamodb-admin',
);

const env = {
  ...process.env,
  DYNAMO_ENDPOINT: endpoint,
  AWS_REGION: process.env.AWS_REGION ?? 'eu-west-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'local',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  PORT: port,
};

let child;

if (fs.existsSync(adminBin)) {
  child = spawn(adminBin, [], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    env,
  });
} else {
  const command = process.platform === 'win32' ? 'npx.cmd dynamodb-admin' : 'npx dynamodb-admin';
  child = spawn(command, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env,
  });
}

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start dynamodb-admin. Run npm install in backend first.');
  console.error(error.message);
  process.exit(1);
});