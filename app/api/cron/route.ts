import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import webpush from 'web-push';

const resend = new Resend(process.env.RESEND_API_KEY);

// Harus pakai Service Role Key agar bisa baca data semua user (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Setup VAPID
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(
        "mailto:admin@nala.my.id",
        vapidPublic,
        vapidPrivate
      );
    } else {
      console.error("VAPID keys tidak ditemukan!");
    }

    // Ambil semua tasks yang belum selesai beserta email user via RPC
    const { data: rawData, error } = await supabaseAdmin.rpc('get_cron_tasks_data');

    if (error || !rawData) {
      console.error("RPC Error:", error);
      return NextResponse.json({ error: 'Gagal mengambil data dari Database', details: error }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let emailsSent = 0;
    let pushesSent = 0;
    let pushFailed = 0;
    const sentEmailsForTask = new Set<string>();

    for (const row of rawData) {
      if (!row.due_date) continue;

      const targetDate = new Date(row.due_date);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Notifikasi H-3, H-1, dan Hari-H
      if (diffDays === 3 || diffDays === 1 || diffDays === 0) {
        const dayText = diffDays === 0 ? "HARI INI! 🚨" : diffDays === 1 ? "BESOK ⏰" : "3 HARI LAGI";

        // === EMAIL (sekali per tugas) ===
        const emailKey = `${row.task_id}`;
        if (row.user_email && !sentEmailsForTask.has(emailKey)) {
          sentEmailsForTask.add(emailKey);
          try {
            await resend.emails.send({
              from: 'NoteNala Reminder <admin@nala.my.id>',
              to: row.user_email,
              subject: `🔔 Pengingat: "${row.title}" tenggat ${dayText}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
                  <h2 style="color: #1d4ed8;">📚 Jangan lupa jadwalmu!</h2>
                  <p>Tugas <strong>"${row.title}"</strong> memiliki tenggat waktu <strong style="color: #dc2626;">${dayText}</strong>.</p>
                  ${row.note ? `<div style="background: #eff6ff; padding: 12px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;"><strong>Catatan:</strong><br>${row.note}</div>` : ''}
                  <a href="https://nala.my.id" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Buka NoteNala →</a>
                </div>
              `
            });
            emailsSent++;
          } catch (err) {
            console.error("Email error:", err);
          }
        }

        // === PWA PUSH NOTIFICATION ===
        // Ambil semua subscriptions milik user ini
        const { data: subs } = await supabaseAdmin
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', row.user_id);

        if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title: `NoteNala: ${dayText}`,
            body: `Tugas "${row.title}" menunggu! Selesaikan sekarang 🔥`,
            url: "/"
          });

          for (const subRow of subs) {
            const pushSub = subRow.subscription;
            if (!pushSub?.endpoint) continue;

            try {
              await webpush.sendNotification(pushSub, payload);
              pushesSent++;
            } catch (err: any) {
              pushFailed++;
              console.error("Push failed:", err.statusCode, err.message);

              // Hapus subscription yang sudah expired (410 Gone)
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabaseAdmin
                  .from('push_subscriptions')
                  .delete()
                  .eq('user_id', row.user_id)
                  .eq('subscription->endpoint', pushSub.endpoint);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Selesai. ${emailsSent} email, ${pushesSent} push berhasil, ${pushFailed} push gagal.`
    });

  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem cron' }, { status: 500 });
  }
}