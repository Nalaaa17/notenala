import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';
import webpush from 'web-push';

const resend = new Resend(process.env.RESEND_API_KEY);


export async function GET() {
    try {
        // Setup webpush details lazily to avoid build errors 
        if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            webpush.setVapidDetails(
              "mailto:admin@nala.my.id",
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
              process.env.VAPID_PRIVATE_KEY
            );
        }

        // 1. Ambil SEMUA data secara sekaligus via RPC (Melewati pemblokiran Keamanan RLS)
        const { data: rawData, error } = await supabase.rpc('get_cron_tasks_data');

        if (error || !rawData) {
            console.error("RPC Error:", error);
            return NextResponse.json({ error: 'Gagal mengambil data dari Database (Cek SQL RPC)', details: error }, { status: 500 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let emailsSent = 0;
        let pushesSent = 0;
        const sentEmailsForTask = new Set(); // Mencegah email ganda

        // Kami kelompokkan tasks agar tidak spam jika ada push_subscription ganda per task
        for (const row of rawData) {
            const targetDate = new Date(row.due_date);
            targetDate.setHours(0, 0, 0, 0);

            const diffTime = targetDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Jika H-3 atau H-1 (besok) atau HARI INI
            if (diffDays === 3 || diffDays === 1 || diffDays === 0) {
                const dayText = diffDays === 1 ? "BESOK" : (diffDays === 0 ? "HARI INI!" : "3 HARI LAGI");
                
                // MENGIRIM EMAIL (Hanya 1x per tugas)
                if (row.user_email && !sentEmailsForTask.has(row.task_id)) {
                    sentEmailsForTask.add(row.task_id);
                    await resend.emails.send({
                        from: 'NoteNala Reminder <admin@nala.my.id>', // Akun Resmi (Verified Domain)
                        to: row.user_email, 
                        subject: `🚨 Pengingat Tugas: ${row.title} (Tenggat: ${dayText})`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2>Halo! Jangan lupa jadwalmu ya! 📚</h2>
                                <p>Tugas/Acara <strong>"${row.title}"</strong> memiliki jadwal tenggat waktu <strong>${dayText}</strong>.</p>
                                
                                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <strong>Catatan Tugas:</strong><br/>
                                    <p style="white-space: pre-wrap;">${row.note || 'Tidak ada detail catatan.'}</p>
                                </div>
                                <p>Buka <a href="https://nala.my.id">NoteNala</a> sekarang utuk menyelesaikan tugasnya!</p>
                            </div>
                        `
                    }).catch(err => console.error("Resend error:", err));
                    emailsSent++;
                }

                // MENGIRIM PWA PUSH NOTIFICATION (NATIVE DEVICE)
                if (row.push_subscription) {
                    const payload = JSON.stringify({
                        title: `NoteNala: Jadwal ${dayText}`,
                        body: `Jangan lupa tugas "${row.title}" kamu sudah dekat! Semangat! 🔥`,
                        url: "/calendar"
                    });

                    try {
                        await webpush.sendNotification(row.push_subscription, payload);
                        pushesSent++;
                    } catch (err: any) {
                        console.log("PWA gagal terkirim misal Kadaluwarsa", err);
                    }
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Selesai memproses jadwal. ${emailsSent} Email Terkirim, ${pushesSent} Push PWA Berhasil.` 
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem cron' }, { status: 500 });
    }
}