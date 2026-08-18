const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat');
const clubsRouter = require('./routes/clubs');
const bookingsRouter = require('./routes/bookings');
const loyaltyRouter = require('./routes/loyalty');
const vouchersRouter = require('./routes/vouchers');
const adminLoyaltyRouter = require('./routes/admin.loyalty');
const adminClubRouter = require('./routes/admin.club');
const adminEventsRouter = require('./routes/admin.events');
const eventsRouter = require('./routes/events');
const scorecardsRouter = require('./routes/scorecards');
const superadminRouter = require('./routes/admin.superadmin');
const paymentsRouter = require('./routes/payments');
const { startBookingExpiryScheduler } = require('./services/booking-expiry.service');
const { startEventScheduler } = require('./services/event-scheduler.service');

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow any localhost port (dev), plus the configured FRONTEND_URL (prod)
    const allowed = process.env.FRONTEND_URL || 'http://localhost:8080';
    if (!origin || origin === allowed || /^http:\/\/localhost:\d+$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS: ' + origin + ' not allowed'));
    }
  },
}));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/vouchers', vouchersRouter);
app.use('/api/admin', adminLoyaltyRouter);
app.use('/api/admin', adminClubRouter);
app.use('/api/admin', adminEventsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/scorecards', scorecardsRouter);
app.use('/api/superadmin', superadminRouter);
app.use('/api/payments', paymentsRouter);

app.listen(config.port, () => {
  logger.info(`Rhapsody backend running on port ${config.port}`);
  startBookingExpiryScheduler();
  startEventScheduler();
});

module.exports = app;
