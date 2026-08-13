const path = require('path');
const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');
const config = require('../config');
const logger = require('../utils/logger');

// Brand tokens
const PURPLE = '#6B21A8';
const GOLD   = '#D97706';
const NAVY   = '#1e1b4b';
const INK    = '#1a1a1a';
const MUTED  = '#6b7280';
const BORDER = '#e2e2e2';
const TOTAL_BG = '#fdf4ff';

function generateInvoiceNumber(refCode) {
  return `INV-${refCode}`;
}

function formatIDR(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

/**
 * Render a PDF invoice buffer for a booking.
 * booking: { id, ref_code, amount, tee_time, players, channel_tag }
 * user:    { name, email, rhapsody_id }
 * club:    { name }
 */
function renderPdfBuffer({ booking, user, club }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const invoiceNo = generateInvoiceNumber(booking.ref_code);

    // ── Header ──────────────────────────────────────────────────────────────
    const headerTop = doc.y;
    doc
      .fillColor(PURPLE)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('RHAPSODY', left, headerTop)
      .fillColor(GOLD)
      .font('Helvetica')
      .fontSize(10)
      .text('Golf Connect', left, headerTop + 26);

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('INVOICE', left, headerTop + 4, { width, align: 'right' });
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(`No. ${invoiceNo}`, left, headerTop + 26, { width, align: 'right' })
      .text(`Tanggal: ${formatDate(new Date().toISOString())}`, left, headerTop + 38, {
        width,
        align: 'right',
      });

    doc.moveDown(3);

    // ── Divider ──────────────────────────────────────────────────────────────
    doc
      .moveTo(left, doc.y)
      .lineTo(right, doc.y)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1);

    // ── Customer + booking detail grid ───────────────────────────────────────
    const rows = [
      ['Nama',          user?.name       || '-', 'Lapangan',   club?.name   || '-'],
      ['Rhapsody ID',   user?.rhapsody_id || '-', 'Tanggal Main', formatDate(booking.tee_time)],
      ['Email',         user?.email      || '-', 'Jam',         formatTime(booking.tee_time)],
      ['Kode Booking',  booking.ref_code  || '-', 'Jumlah Pemain', String(booking.players || 1)],
    ];

    const rowH = 28;
    const gap  = 20;
    const col  = (width - gap) / 2;
    const boxTop = doc.y;
    const boxH   = rows.length * rowH + 16;

    doc.roundedRect(left, boxTop, width, boxH, 6).strokeColor(BORDER).lineWidth(1).stroke();

    rows.forEach(([l1, v1, l2, v2], i) => {
      const y = boxTop + 10 + i * rowH;
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(l1, left + 14, y, { width: col - 14 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(v1, left + 14, y + 11, { width: col - 14 });
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(l2, left + col + gap, y, { width: col - 14 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(v2, left + col + gap, y + 11, { width: col - 14 });
    });

    doc.y = boxTop + boxH + 24;

    // ── Total band ───────────────────────────────────────────────────────────
    const totalH = 50;
    const totalY = doc.y;
    doc.rect(left, totalY, width, totalH).fill(TOTAL_BG);
    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Total Dibayar', left + 20, totalY + 18, { width: width / 2 });
    doc
      .fillColor(PURPLE)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(formatIDR(booking.amount), left, totalY + 14, { width: width - 20, align: 'right' });

    doc.y = totalY + totalH + 30;

    // ── Payment status badge ─────────────────────────────────────────────────
    doc
      .fillColor(GOLD)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('✓ LUNAS', left, doc.y, { width, align: 'center' });

    doc.moveDown(2);

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - doc.page.margins.bottom - 50;
    doc.moveTo(left, footerY).lineTo(right, footerY).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text('Terima kasih telah bermain bersama Rhapsody Golf Connect.', left, footerY + 10, {
        width,
        align: 'center',
      })
      .text('Tunjukkan kode booking ini saat check-in di lapangan.', left, footerY + 22, {
        width,
        align: 'center',
      });

    doc.end();
  });
}

/**
 * Generate a PDF invoice, upload to Supabase Storage, return public URL.
 */
async function generateInvoice({ booking, user, club }) {
  const pdfBuffer = await renderPdfBuffer({ booking, user, club });
  const fileName = `${booking.ref_code}-${Date.now()}.pdf`;
  const storagePath = `${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (upErr) {
    logger.error('Invoice upload failed', { message: upErr.message });
    throw new Error('Failed to upload invoice');
  }

  const { data: urlData } = supabase.storage
    .from(config.supabase.storageBucket)
    .getPublicUrl(storagePath);

  const pdfUrl = urlData?.publicUrl;

  // Persist invoice record
  await supabase.from('invoices').insert({
    booking_id: booking.id,
    user_id: booking.user_id,
    invoice_number: generateInvoiceNumber(booking.ref_code),
    amount: booking.amount,
    pdf_url: pdfUrl,
    status: 'Issued',
  });

  logger.info('Invoice generated', { refCode: booking.ref_code, pdfUrl });

  return { pdf_url: pdfUrl, invoice_number: generateInvoiceNumber(booking.ref_code) };
}

module.exports = { generateInvoice };
