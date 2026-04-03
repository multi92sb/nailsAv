const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const localDir = path.join(rootDir, 'dynamodb-local');
const jarPath = path.join(localDir, 'DynamoDBLocal.jar');
const libPath = path.join(localDir, 'DynamoDBLocal_lib');
const dbPath = path.join(rootDir, '.dynamodb');
const port = process.env.DYNAMODB_PORT ?? '8000';

if (!fs.existsSync(jarPath)) {
  console.error('Missing DynamoDBLocal.jar. Download/extract DynamoDB Local into backend/dynamodb-local first.');
  process.exit(1);
}

fs.mkdirSync(dbPath, { recursive: true });

const args = [
  `-Djava.library.path=${libPath}`,
  '-jar',
  jarPath,
  '-sharedDb',
  '-dbPath',
  dbPath,
  '-port',
  port,
];

const child = spawn('java', args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start DynamoDB Local. Ensure Java is installed and available in PATH.');
  console.error(error.message);
  process.exit(1);
});