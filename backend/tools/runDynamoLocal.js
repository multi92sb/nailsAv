const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const localDir = path.join(rootDir, 'dynamodb-local');
const jarPath = path.join(localDir, 'DynamoDBLocal.jar');
const libPath = path.join(localDir, 'DynamoDBLocal_lib');
const dbPath = path.join(rootDir, '.dynamodb');
const port = process.env.DYNAMODB_PORT ?? '8000';

const DYNAMO_DOWNLOAD_URL = 'https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.zip';

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    console.log(`Downloading DynamoDB Local from ${url}...`);

    https.get(url, { timeout: 120000 }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status code: ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize) {
          const percent = Math.floor((downloaded / totalSize) * 100);
          if (percent !== lastPercent && percent % 10 === 0) {
            console.log(`Download progress: ${percent}%`);
            lastPercent = percent;
          }
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('Download complete.');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    }).on('timeout', () => {
      fs.unlink(dest, () => {});
      reject(new Error('Download timed out'));
    });
  });
}

function extractZip(zipPath, extractTo) {
  console.log('Extracting DynamoDB Local...');

  // Check if PowerShell is available (Windows)
  try {
    execSync('powershell -Command "Expand-Archive"', { stdio: 'pipe' });
  } catch (e) {
    // Try with unzip command (Linux/Mac)
    try {
      execSync('unzip --help', { stdio: 'pipe' });
      execSync(`unzip -o "${zipPath}" -d "${extractTo}"`, { stdio: 'inherit' });
      console.log('Extraction complete.');
      return;
    } catch (unzipErr) {
      throw new Error('Neither PowerShell Expand-Archive nor unzip command found. Please extract manually.');
    }
  }

  // Use PowerShell Expand-Archive
  execSync(
    `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTo}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log('Extraction complete.');
}

async function ensureDynamoDBLocal() {
  if (fs.existsSync(jarPath)) {
    return; // Already exists
  }

  console.log('DynamoDB Local not found. Setting up...');

  // Create directory
  fs.mkdirSync(localDir, { recursive: true });

  // Download zip
  const zipPath = path.join(localDir, 'dynamodb_local_latest.zip');

  try {
    await downloadFile(DYNAMO_DOWNLOAD_URL, zipPath);
  } catch (err) {
    console.error('Failed to download DynamoDB Local:', err.message);
    console.error('You can manually download from:');
    console.error('https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html');
    process.exit(1);
  }

  // Extract
  try {
    extractZip(zipPath, localDir);
    fs.unlinkSync(zipPath); // Clean up zip file
  } catch (err) {
    console.error('Failed to extract DynamoDB Local:', err.message);
    process.exit(1);
  }

  // Verify JAR exists after extraction
  if (!fs.existsSync(jarPath)) {
    console.error('DynamoDBLocal.jar not found after extraction. Please check the extracted files.');
    process.exit(1);
  }

  console.log('DynamoDB Local setup complete!');
}

async function main() {
  await ensureDynamoDBLocal();

  // Ensure data directory exists
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

  console.log(`\nStarting DynamoDB Local on port ${port}...`);

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
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
