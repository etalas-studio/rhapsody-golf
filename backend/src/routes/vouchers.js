const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { getUserVouchers, redeemVoucher } = require('../services/voucher.service');
const logger = require('../utils/logger');

const router = Router();

router.use(requireAuth);

/**
 * GET /api/vouchers?clubId=
 * Active vouchers for the authenticated user.
 */
router.get('/', async (req, res) => {
  const { clubId, allStatuses } = req.query;
  try {
    const vouchers = await getUserVouchers(req.userId, { clubId, allStatuses: allStatuses === 'true' });
    res.json({ vouchers });
  } catch (err) {
    logger.error('GET /vouchers error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/vouchers/:code/redeem
 * Body: { clubId } — validates and marks voucher Redeemed.
 * Returns { discount, voucherId }.
 */
router.post('/:code/redeem', async (req, res) => {
  const { clubId } = req.body;
  if (!clubId) return res.status(400).json({ error: 'clubId is required' });

  try {
    const result = await redeemVoucher({
      voucherCode: req.params.code,
      userId: req.userId,
      clubId,
    });
    res.json(result);
  } catch (err) {
    logger.error('POST /vouchers/:code/redeem error', { message: err.message });
    const code = err.message === 'Voucher not found' ? 404
      : err.message.startsWith('Voucher belongs') ? 403
      : 400;
    res.status(code).json({ error: err.message });
  }
});

module.exports = router;
