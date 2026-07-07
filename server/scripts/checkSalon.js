require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });
    const [users] = await c.execute("SELECT id, email, role FROM users WHERE role = 'salon'");
    console.log('salon users', users);
    const [salons] = await c.execute('SELECT id, salon_name, user_id, distributor_id FROM salons');
    console.log('salons', salons);

    const login = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'salon@example.com', password: 'password123' }),
    });
    const body = await login.json();
    console.log('login', login.status, body);

    if (body.token) {
        for (const path of ['/salons/me', '/favorites', '/products']) {
            const r = await fetch(`http://localhost:5000/api${path}`, {
                headers: { Authorization: `Bearer ${body.token}` },
            });
            const j = await r.json();
            console.log(path, r.status, Array.isArray(j) ? `count=${j.length}` : j);
        }
    }
    await c.end();
})();
