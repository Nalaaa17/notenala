import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  'mailto:admin@nala.my.id',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, taskId, taskTitle, taskNote, dueTime } = await req.json();

    if (!userId || !taskId || !taskTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ambil semua push subscription milik user ini
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: 'No subscriptions found for user' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: `⏰ Pengingat Tugas`,
      body: `${taskTitle}${taskNote ? ` — ${taskNote.slice(0, 60)}` : ''}`,
      icon: '/logo-v2.png',
      badge: '/logo-v2.png',
      url: '/',
      tag: `task-reminder-${taskId}`, // Cegah duplikat notif untuk task yang sama
    });

    const results = await Promise.allSettled(
      subscriptions.map((row: any) =>
        webpush.sendNotification(row.subscription, payload)
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Pengingat dikirim ke ${sent} perangkat. ${failed > 0 ? `Gagal: ${failed}` : ''}`,
      sent,
      failed,
    });
  } catch (error: any) {
    console.error('Send reminder error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
