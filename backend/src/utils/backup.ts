import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(__dirname, '../../backups');

export async function runBackup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[Backup] DATABASE_URL not set, skipping backup');
    return;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const filename = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    await execAsync(`pg_dump "${databaseUrl}" > "${filepath}"`);
    console.log(`[Backup] Success: ${filename}`);
    deleteOldBackups();
  } catch (err) {
    console.error('[Backup] Failed:', err);
  }
}

// Keep only the last 7 backups
function deleteOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  files.slice(7).forEach(f => {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name));
    console.log(`[Backup] Deleted old backup: ${f.name}`);
  });
}

// Schedule: runs every 24 hours
export function startBackupScheduler() {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Run once on startup (after 1 min delay to let server fully start)
  setTimeout(runBackup, 60 * 1000);

  // Then every 24 hours
  setInterval(runBackup, TWENTY_FOUR_HOURS);

  console.log('[Backup] Scheduler started — daily backups enabled');
}
