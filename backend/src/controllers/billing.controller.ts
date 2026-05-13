import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get or create Stripe customer
    const userResult = await query(
      'SELECT email, full_name, stripe_customer_id FROM users WHERE id = $1',
      [req.user?.userId]
    );
    const user = userResult.rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { userId: req.user!.userId },
      });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user?.userId]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/billing`,
      subscription_data: { metadata: { userId: req.user!.userId } },
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) { next(err); }
};

export const createPortalSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userResult = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user?.userId]
    );
    const { stripe_customer_id } = userResult.rows[0];
    if (!stripe_customer_id) throw new AppError(400, 'No billing account found');

    const session = await stripe.billingPortal.sessions.create({
      customer: stripe_customer_id,
      return_url: `${env.FRONTEND_URL}/billing`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) { next(err); }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.userId;
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        await query(
          'UPDATE users SET plan = $1, stripe_subscription_id = $2 WHERE id = $3',
          [isActive ? 'pro' : 'free', sub.id, userId]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await query(
          "UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE id = $1",
          [sub.metadata.userId]
        );
        break;
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
};

export const getBillingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await query(
      'SELECT plan, stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1',
      [req.user?.userId]
    );
    // AI usage today
    const usageResult = await query(
      `SELECT COUNT(*) as count FROM ai_usage 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [req.user?.userId]
    );
    res.json({
      success: true,
      data: {
        ...result.rows[0],
        ai_usage_today: parseInt(usageResult.rows[0].count),
        daily_limit: result.rows[0].plan === 'free' ? 10 : null,
      },
    });
  } catch (err) { next(err); }
};
