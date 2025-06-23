import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to copy to dist folder
const filesToCopy = ['404.html', '.htaccess', '_redirects'];

filesToCopy.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(__dirname, 'dist', file);

  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ ${file} copied to dist folder`);
    } else {
      console.log(`⚠️  ${file} not found, skipping`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${file}:`, error);
  }
}); 