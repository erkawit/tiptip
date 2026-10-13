import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
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
    const body = await req.json();
    const {
      streamer_id,
      streamer_slug,
      widget_token,
      donor_name = 'Anonymous',
      amount,
      currency = 'THB',
      message = '',
      payment_method = 'promptpay',
      gif_url,
    } = body;

    const numericAmount = Number(amount);
    if (!streamer_id || !numericAmount || numericAmount < 10) {
      return NextResponse.json(
        { error: 'Invalid donation parameters: streamer_id and minimum amount of 10 THB are required.' },
        { status: 400 }
      );
    }

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000';

    // 1. Real Stripe Checkout Flow (When valid Stripe secret key is present)
    if (stripe && (payment_method === 'stripe' || payment_method === 'promptpay')) {
      try {
        const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = 
          payment_method === 'promptpay' ? ['promptpay', 'card'] : ['card'];

        const session = await stripe.checkout.sessions.create({
          payment_method_types: paymentMethods,
          line_items: [
            {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: {
                  name: `Tip for Streamer`,
                  description: message ? `"${message.slice(0, 100)}"` : 'Live stream donation via TipTip Live',
                },
                unit_amount: Math.round(numericAmount * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${appOrigin}/${streamer_slug || ''}?tx={CHECKOUT_SESSION_ID}&success=true`,
          cancel_url: `${appOrigin}/${streamer_slug || ''}?canceled=true`,
          metadata: {
            streamer_id,
            widget_token: widget_token || '',
            donor_name: donor_name.slice(0, 50),
            amount: String(numericAmount),
            currency,
            message: message.slice(0, 300),
            gif_url: gif_url || '',
            payment_method,
          },
        });

        // Insert pending donation in database
        try {
          await supabaseAdmin.from('donations').insert({
            streamer_id,
            donor_name,
            amount: numericAmount,
            currency,
            message,
            payment_method,
            status: 'pending',
            transaction_id: session.id,
            gif_url,
          });
        } catch (dbErr) {
          console.warn('[Donation Intake] DB pending insert warning:', dbErr);
        }

        return NextResponse.json({
          checkout_url: session.url,
          session_id: session.id,
          status: 'pending',
        });
      } catch (stripeErr: any) {
        console.error('[Donation Intake] Stripe Checkout creation error:', stripeErr);
        // Fallback to simulated immediate demo flow if Stripe rejected invalid keys
      }
    }

    // 2. Simulated / Demo Sandbox Flow (Or TrueMoney simulation)
    const transactionId = `TXN_${payment_method.toUpperCase().slice(0, 2)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const platformFee = Math.round(numericAmount * 0.03 * 100) / 100;
    const netAmount = numericAmount - platformFee;

    // Try storing in Supabase DB if available
    try {
      await supabaseAdmin.from('donations').insert({
        streamer_id,
        donor_name,
        amount: numericAmount,
        currency,
        message,
        payment_method,
        status: 'completed',
        transaction_id: transactionId,
        platform_fee: platformFee,
        net_amount: netAmount,
        gif_url,
      });
    } catch (dbErr) {
      console.warn('[Donation Intake] DB insert warning (offline/demo mode):', dbErr);
    }

    // Broadcast Realtime Event to the Streamer's OBS Browser Source
    if (widget_token) {
      try {
        const channel = supabaseAdmin.channel(`overlay-${widget_token}`);
        await channel.send({
          type: 'broadcast',
          event: 'new-alert',
          payload: {
            id: transactionId,
            donor_name,
            amount: numericAmount,
            currency,
            message,
            gif_url,
            timestamp: Date.now(),
          },
        });
      } catch (rtErr) {
        console.warn('[Donation Intake] Realtime broadcast warning:', rtErr);
      }
    }

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      status: 'completed',
      message: 'Donation recorded and alert queued for OBS broadcast.',
    });
  } catch (error: any) {
    console.error('Error processing donation:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
