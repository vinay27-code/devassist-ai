import { Router } from 'express';
import express from 'express';
import { createCheckoutSession, createPortalSession, handleWebhook, getBillingStatus } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Webhook must receive raw body (before json parsing)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.use(authenticate);
router.get('/status', getBillingStatus);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);

export default router;
