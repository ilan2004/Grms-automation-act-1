// scripts/ensure-logs-dir.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Log setup info
console.log('Running post-build script to ensure logs directory exists');

// Create logs directory in project root if it doesn't exist
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory at: ${logsDir}`);
} else {
    console.log(`Logs directory already exists at: ${logsDir}`);
}

// Create a placeholder.txt file to ensure the directory is included in package
const placeholderPath = path.join(logsDir, 'placeholder.txt');
const placeholderContent = `This file ensures the logs directory is included in the installer package.
Log files will be written to this directory when the application runs.
`;

fs.writeFileSync(placeholderPath, placeholderContent);
console.log(`Created placeholder.txt in logs directory`);

console.log('Post-build script completed successfully');