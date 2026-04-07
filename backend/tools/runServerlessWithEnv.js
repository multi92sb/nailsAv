const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing env file: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const action = process.argv[2] ?? 'deploy';
const stage = process.argv[3] ?? 'stage';
const extraArgs = process.argv.slice(4);

const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, `.env.${stage}`);

try {
  loadEnvFile(envFile);
} catch (error) {
  console.error(error.message);
  console.error(`Create ${envFile} from .env.${stage}.example before running this command.`);
  process.exit(1);
}

const slsBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'serverless.cmd' : 'serverless',
);

const args = [action, '--stage', stage, ...extraArgs];
let child;

if (process.platform === 'win32') {
  const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const command = ['npx', 'serverless', ...args.map(quote)].join(' ');
  child = spawn(command, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
} else {
  child = spawn(slsBin, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to run Serverless from local node_modules/.bin.');
  console.error(error.message);
  process.exit(1);
});
