const { Router } = require('express');
const { runConversationTurn } = require('../services/ai.service');
const logger = require('../utils/logger');

const router = Router();

/**
 * POST /api/chat/message
 * Body: { userId, message, history?, currentState?, sessionId? }
 * Returns: { reply, confirmButtons, bookingPayload, history, state, sessionId }
 *
 * sessionId: omit on first call — service creates one and returns it.
 * Pass returned sessionId on all subsequent calls for the same conversation.
 */
router.post('/message', async (req, res) => {
  const { userId, message, history, currentState, sessionId } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }

  try {
    const result = await runConversationTurn({
      userId,
      userText: message,
      history: history || [],
      currentState,
      sessionId,
    });

    res.json({
      reply: result.finalText,
      confirmButtons: result.confirmButtons,
      bookingPayload: result.bookingPayload,
      snapToken: result.snapToken,
      orderId: result.orderId,
      invoiceUrl: result.invoiceUrl,
      history: result.messages,
      state: result.state,
      sessionId: result.sessionId,
    });
  } catch (err) {
    logger.error('Chat endpoint error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
