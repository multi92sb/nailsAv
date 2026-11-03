const path = require('path');
const { execFileSync, execSync } = require('child_process');

const stage = process.argv[2] ?? 'prod';
const stackName = `nail-booking-backend-${stage}`;
const region = 'eu-west-1';
const rootDir = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(rootDir, 'frontend');
const distDir = path.join(frontendDir, 'dist');

function runAws(args) {
  return execFileSync('aws', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function stackOutput(key) {
  const value = runAws([
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    stackName,
    '--region',
    region,
    '--query',
    `Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]`,
    '--output',
    'text',
  ]);

  if (!value || value === 'None') {
    throw new Error(`Stack ${stackName} has no output named ${key}. Deploy the backend first.`);
  }

  return value;
}

try {
  console.log(`Building frontend for ${stage}...`);
  execSync('npm run build --workspace=frontend', {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const bucket = stackOutput('FrontendBucketName');
  const distributionId = stackOutput('FrontendDistributionId');
  const siteUrl = stackOutput('FrontendUrl');

  console.log(`Uploading ${distDir} to s3://${bucket}...`);
  runAws([
    's3',
    'sync',
    distDir,
    `s3://${bucket}`,
    '--delete',
    '--exclude',
    'index.html',
    '--exclude',
    'assets/*',
    '--cache-control',
    'public, max-age=3600',
    '--region',
    region,
  ]);

  // Keep old hashed assets until clients holding the previous index.html have moved on.
  runAws([
    's3',
    'sync',
    path.join(distDir, 'assets'),
    `s3://${bucket}/assets`,
    '--cache-control',
    'public, max-age=31536000, immutable',
    '--region',
    region,
  ]);

  runAws([
    's3',
    'cp',
    path.join(distDir, 'index.html'),
    `s3://${bucket}/index.html`,
    '--cache-control',
    'no-cache, no-store, must-revalidate',
    '--content-type',
    'text/html; charset=utf-8',
    '--region',
    region,
  ]);

  console.log(`Invalidating CloudFront ${distributionId}...`);
  const invalidationId = runAws([
    'cloudfront',
    'create-invalidation',
    '--distribution-id',
    distributionId,
    '--paths',
    '/*',
    '--region',
    'us-east-1',
    '--query',
    'Invalidation.Id',
    '--output',
    'text',
  ]);

  console.log(`Frontend deployed: ${siteUrl}`);
  console.log(`CloudFront invalidation: ${invalidationId}`);
} catch (error) {
  console.error(`Frontend deploy failed: ${error.message}`);
  process.exit(1);
}
