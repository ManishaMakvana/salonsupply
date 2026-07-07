const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    // Hash for "password123"
    const hash = "$2b$10$YDSr3xwaopeadWHa1BXdiuu3tV08Zd.MC19YYrx.c0KmFaQNSk.Iq";
    
    await conn.execute('UPDATE users SET password = ?', [hash]);
    console.log('Passwords updated successfully!');
    conn.end();
}

run().catch(console.error);
