const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePassword() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    const passwordHash = '$2b$10$itOLmWv8DBOiiWsz.wuRr.Je2cpfYb/KXbjca1OU17MPnceCfiQ9i';
    const email = 'john@example.com';

    await connection.execute('UPDATE users SET password = ? WHERE email = ?', [passwordHash, email]);
    console.log('Password updated successfully');
    await connection.end();
}

updatePassword().catch(console.error);
