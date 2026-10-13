import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const isRealStripeConfigured = Boolean(
  stripeSecretKey && !stripeSecretKey.includes('mock') && stripeSecretKey.startsWith('sk_')
);

const stripe = isRealStripeConfigured
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    // Verify webhook signature
    if (webhookSecret && signature && stripe) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      // In development / demo environment without active Stripe CLI
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Missing webhook signature secret in production' }, { status: 400 });
      }
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    // Process completed checkout session or payment intent
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const session = event.data.object as any;
      const metadata = session.metadata || {};

      const streamerId = metadata.streamer_id;
      const widgetToken = metadata.widget_token;
      const donorName = metadata.donor_name || 'Generous Supporter';
      const amount = metadata.amount ? Number(metadata.amount) : (session.amount_total ? session.amount_total / 100 : 100);
      const currency = session.currency?.toUpperCase() || 'THB';
      const message = metadata.message || '';
      const gifUrl = metadata.gif_url;
      const paymentMethod = metadata.payment_method || 'stripe';
      const transactionId = session.id || `TXN_ST_${Date.now()}`;

      console.log(`[Stripe Webhook] Processing confirmed payment for streamer ${streamerId}: ฿${amount}`);

      // 1. Idempotency Check & Database Update
      try {
        const { data: existingDonation } = await supabaseAdmin
          .from('donations')
          .select('id, is_alerted, status')
          .eq('transaction_id', transactionId)
          .single();

        if (existingDonation && existingDonation.is_alerted && existingDonation.status === 'completed') {
          return NextResponse.json({ received: true, message: 'Already processed and alerted' });
        }

        const platformFee = Math.round(amount * 0.03 * 100) / 100;
        const netAmount = amount - platformFee;

        // Upsert donation record with completed status (will trigger handle_donation_completed in DB)
        await supabaseAdmin.from('donations').upsert({
          transaction_id: transactionId,
          streamer_id: streamerId,
          donor_name: donorName,
          amount: amount,
          currency: currency,
          message: message,
          payment_method: paymentMethod,
          status: 'completed',
          platform_fee: platformFee,
          net_amount: netAmount,
          gif_url: gifUrl,
          is_alerted: true,
          completed_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('[Stripe Webhook] Supabase update warning:', dbErr);
      }

      // 2. Realtime Broadcast to OBS Overlay Browser Source
      if (widgetToken) {
        try {
          const channel = supabaseAdmin.channel(`overlay-${widgetToken}`);
          await channel.send({
            type: 'broadcast',
            event: 'new-alert',
            payload: {
              id: transactionId,
              donor_name: donorName,
              amount: amount,
              currency: currency,
              message: message,
              gif_url: gifUrl,
              timestamp: Date.now(),
            },
          });
        } catch (rtErr) {
          console.warn('[Stripe Webhook] Realtime broadcast warning:', rtErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Processing error:', err);
    return NextResponse.json(
      { error: err?.message || 'Webhook handler internal error' },
      { status: 500 }
    );
  }
}
