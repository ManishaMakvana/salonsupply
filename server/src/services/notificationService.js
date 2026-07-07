const db = require('../config/db');

/**
 * In-app notification + optional SMS/WhatsApp (console or env-configured webhook).
 */
async function notifyUser({ userId, title, message, type = 'general', meta = null, phone = null }) {
    if (!userId) return;

    const channels = ['in_app'];
    if (process.env.SMS_ENABLED === 'true' && phone) channels.push('sms');
    if (process.env.WHATSAPP_ENABLED === 'true' && phone) channels.push('whatsapp');

    for (const channel of channels) {
        let deliveryStatus = 'sent';
        try {
            if (channel === 'sms') {
                await sendSms(phone, `${title}: ${message}`);
            } else if (channel === 'whatsapp') {
                await sendWhatsApp(phone, `${title}: ${message}`);
            }
        } catch (err) {
            deliveryStatus = 'failed';
            console.error(`[notify ${channel}]`, err.message);
        }

        await db.execute(
            `INSERT INTO notifications (user_id, title, message, type, channel, delivery_status, meta, is_read)
             VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
            [
                userId,
                title,
                message,
                type,
                channel,
                channel === 'in_app' ? 'sent' : deliveryStatus,
                meta ? JSON.stringify(meta) : null,
            ]
        );
    }
}

async function notifySalonUsers(salonId, payload) {
    const [rows] = await db.execute(
        `SELECT u.id, u.phone FROM users u
         JOIN salons s ON s.user_id = u.id WHERE s.id = ?`,
        [salonId]
    );
    for (const u of rows) {
        await notifyUser({ userId: u.id, phone: u.phone, ...payload });
    }
}

async function notifyDistributorUsers(distributorId, payload) {
    const [rows] = await db.execute(
        `SELECT id, phone FROM users WHERE distributor_id = ? AND role IN ('distributor', 'super_admin')`,
        [distributorId]
    );
    for (const u of rows) {
        await notifyUser({ userId: u.id, phone: u.phone, ...payload });
    }
}

async function sendSms(phone, text) {
    if (process.env.TWILIO_ACCOUNT_SID) {
        // Placeholder for Twilio — log until credentials configured
        console.log(`[SMS → ${phone}]`, text);
        return;
    }
    console.log(`[SMS stub → ${phone}]`, text);
}

async function sendWhatsApp(phone, text) {
    if (process.env.WHATSAPP_WEBHOOK_URL && typeof fetch === 'function') {
        await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phone, text }),
        });
        return;
    }
    console.log(`[WhatsApp stub → ${phone}]`, text);
}

module.exports = { notifyUser, notifySalonUsers, notifyDistributorUsers };
