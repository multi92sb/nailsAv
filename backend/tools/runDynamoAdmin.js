const { spawn } = require('child_process');

const port = process.env.DYNAMO_ADMIN_PORT ?? '8001';
const endpoint = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['dynamodb-admin'],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      DYNAMO_ENDPOINT: endpoint,
      AWS_REGION: process.env.AWS_REGION ?? 'eu-west-1',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'local',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
      PORT: port,
    },
  },
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start dynamodb-admin. Run npm install in backend first.');
  console.error(error.message);
  process.exit(1);
});