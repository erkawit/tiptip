import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transaction_id,
      streamer_id,
      widget_token,
      amount,
      donor_name = 'TrueMoney Supporter',
      message = '',
      phone_last_digits,
      secret_key,
    } = body;

    // Verify secret signature / authorization
    const expectedSecret = process.env.TRUEMONEY_WEBHOOK_SECRET || 'tm_secret_live_key';
    if (secret_key && secret_key !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    if (!transaction_id || !streamer_id || !amount) {
      return NextResponse.json({ error: 'Missing mandatory payload fields' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    const platformFee = Math.round(numericAmount * 0.03 * 100) / 100;
    const netAmount = numericAmount - platformFee;

    // Idempotency check: Ensure slip or transaction hasn't already fired
    try {
      const { data: existing } = await supabaseAdmin
        .from('donations')
        .select('id, is_alerted')
        .eq('transaction_id', transaction_id)
        .single();

      if (existing && existing.is_alerted) {
        return NextResponse.json({ success: true, message: 'Transaction already acknowledged' });
      }

      await supabaseAdmin.from('donations').upsert({
        transaction_id,
        streamer_id,
        donor_name: `${donor_name} ${phone_last_digits ? `(${phone_last_digits})` : ''}`,
        amount: numericAmount,
        currency: 'THB',
        message: message,
        payment_method: 'truemoney',
        status: 'completed',
        platform_fee: platformFee,
        net_amount: netAmount,
        is_alerted: true,
        completed_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[TrueMoney Webhook] DB update warning:', dbErr);
    }

    // Broadcast live event to Streamer overlay
    if (widget_token) {
      try {
        const channel = supabaseAdmin.channel(`overlay-${widget_token}`);
        await channel.send({
          type: 'broadcast',
          event: 'new-alert',
          payload: {
            id: transaction_id,
            donor_name: donor_name,
            amount: numericAmount,
            currency: 'THB',
            message: message,
            timestamp: Date.now(),
          },
        });
      } catch (rtErr) {
        console.warn('[TrueMoney Webhook] Realtime broadcast warning:', rtErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'TrueMoney transaction recorded and alert dispatched.',
      transaction_id,
    });
  } catch (error: any) {
    console.error('TrueMoney webhook processing failed:', error);
    return NextResponse.json(
      { error: error?.message || 'TrueMoney webhook server error' },
      { status: 500 }
    );
  }
}
