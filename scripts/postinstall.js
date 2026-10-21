const { execSync } = require('child_process');
const path = require('path');

console.log('Running postinstall script...');

try {
  const schemaPath = path.resolve(__dirname, '../backend/prisma/schema.prisma');
  console.log('Generating Prisma Client for schema:', schemaPath);
  execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
  console.log('Prisma Client generated successfully.');
} catch (err) {
  console.warn('Postinstall notice:', err.message);
}
