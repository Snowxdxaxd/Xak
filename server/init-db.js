import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

try {
  await query(sql);
  console.log('Database schema applied successfully.');
  process.exit(0);
} catch (error) {
  console.error('Failed to apply schema:', error.message);
  process.exit(1);
}
