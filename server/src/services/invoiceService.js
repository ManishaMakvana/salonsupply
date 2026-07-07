const PDFDocument = require('pdfkit');

function generateGstInvoicePdf({ order, items, distributor, salon, payments }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(distributor.business_name || 'Distributor');
        if (distributor.gst_number) doc.text(`GSTIN: ${distributor.gst_number}`);
        if (distributor.address) doc.text(distributor.address);
        doc.moveDown();
        doc.text(`Invoice for Order: ${order.order_number}`);
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`);
        doc.moveDown();
        doc.text('Bill To:');
        doc.text(salon.salon_name);
        if (salon.address) doc.text(salon.address);
        if (salon.phone) doc.text(`Phone: ${salon.phone}`);
        doc.moveDown();

        doc.text('Items:', { underline: true });
        items.forEach((item) => {
            doc.text(
                `${item.product_name} × ${item.quantity} @ ₹${parseFloat(item.price).toFixed(2)} = ₹${parseFloat(item.total).toFixed(2)}`
            );
        });
        doc.moveDown();
        doc.fontSize(12).text(`Total: ₹${parseFloat(order.total_amount).toFixed(2)}`, { align: 'right' });

        const paid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        doc.text(`Paid: ₹${paid.toFixed(2)}`, { align: 'right' });
        doc.text(`Balance: ₹${Math.max(0, parseFloat(order.total_amount) - paid).toFixed(2)}`, {
            align: 'right',
        });
        doc.moveDown(2);
        doc.fontSize(8).text('This is a computer-generated invoice from SalonSupply.', { align: 'center' });

        doc.end();
    });
}

module.exports = { generateGstInvoicePdf };
