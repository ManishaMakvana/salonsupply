/**
 * Links salon login users to salons rows (by name or single orphan per distributor).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    const [users] = await conn.execute("SELECT id, name, distributor_id FROM users WHERE role = 'salon'");
    for (const user of users) {
        const [linked] = await conn.execute('SELECT id FROM salons WHERE user_id = ?', [user.id]);
        if (linked.length) {
            console.log(`User ${user.id} already linked to salon ${linked[0].id}`);
            continue;
        }

        const [byName] = await conn.execute(
            'SELECT id FROM salons WHERE distributor_id = ? AND salon_name = ? LIMIT 1',
            [user.distributor_id, user.name]
        );
        if (byName.length) {
            await conn.execute('UPDATE salons SET user_id = ? WHERE id = ?', [user.id, byName[0].id]);
            console.log(`Linked user ${user.id} → salon ${byName[0].id} (by name)`);
            continue;
        }

        const [orphans] = await conn.execute(
            'SELECT id FROM salons WHERE distributor_id = ? AND user_id IS NULL',
            [user.distributor_id]
        );
        if (orphans.length === 1) {
            await conn.execute('UPDATE salons SET user_id = ? WHERE id = ?', [user.id, orphans[0].id]);
            console.log(`Linked user ${user.id} → salon ${orphans[0].id} (only orphan)`);
        } else {
            console.warn(`User ${user.id} (${user.name}): manual link needed (${orphans.length} orphans)`);
        }
    }

    await conn.end();
    console.log('Done.');
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
