import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Safe migration with automatic backup
 * Usage: npm run migrate
 */

const BACKUP_DIR = './backups';
const DB_FILE = './dev.db';
const PRISMA_DB_FILE = './prisma/dev.db';

function createBackup() {
    if (!existsSync(BACKUP_DIR)) {
        mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_');

    try {
        if (existsSync(DB_FILE)) {
            const backupPath = join(BACKUP_DIR, `pre_migrate_${timestamp}.db`);
            copyFileSync(DB_FILE, backupPath);
            console.log(`✅ Backup created: ${backupPath}`);
        }

        if (existsSync(PRISMA_DB_FILE)) {
            const backupPath = join(BACKUP_DIR, `pre_migrate_prisma_${timestamp}.db`);
            copyFileSync(PRISMA_DB_FILE, backupPath);
            console.log(`✅ Backup created: ${backupPath}`);
        }
    } catch (error: any) {
        console.error('❌ Backup failed:', error.message);
        process.exit(1);
    }
}

function runMigration() {
    console.log('\n📦 Creating backup before migration...\n');
    createBackup();

    console.log('\n🔧 Running Prisma migration...\n');

    try {
        // Use db push instead of migrate to avoid reset
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('💡 You can restore from backup using: npm run restore');
        process.exit(1);
    }
}

runMigration();
