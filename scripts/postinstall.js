const { execSync } = require('child_process');
const path = require('path');

console.log('Running postinstall script...');

try {
  const schemaPath = path.resolve(__dirname, '../backend/prisma/schema.prisma');
  const prismaBin = path.resolve(__dirname, '../backend/node_modules/prisma/build/index.js');
  
  if (process.env.VERCEL || process.env.CI) {
    execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
  } else {
    // Local environment
    try {
      execSync(`node "${prismaBin}" generate --schema="${schemaPath}"`, { stdio: 'inherit' });
    } catch (localErr) {
      console.log('Local Prisma client generation note (existing client will be used):', localErr.message);
    }
  }
} catch (err) {
  console.warn('Postinstall finished with notice:', err.message);
}
