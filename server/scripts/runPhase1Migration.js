/**
 * Run phase1.sql. MySQL 8 may not support ADD COLUMN IF NOT EXISTS — script handles gracefully.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'salonsupply',
        multipleStatements: true,
    });

    const sql = fs.readFileSync(path.join(__dirname, '../migrations/phase1.sql'), 'utf8');
    const statements = sql
        .split(';')
        .map((s) => s.replace(/--[^\n]*/g, '').trim())
        .filter((s) => s.length > 0);

    for (const stmt of statements) {
        try {
            await conn.query(stmt);
            console.log('OK:', stmt.slice(0, 60).replace(/\s+/g, ' ') + '...');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('Skip (exists):', stmt.slice(0, 50));
            } else {
                console.error('Failed:', stmt.slice(0, 80));
                throw err;
            }
        }
    }

    await conn.end();
    console.log('Phase 1 migration complete.');
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
