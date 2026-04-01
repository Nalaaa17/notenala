import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const myEmail = process.env.MY_PERSONAL_EMAIL!;

export async function GET() {
    try {
        // 1. Ambil semua tugas yang BELUM SELESAI
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('completed', false);

        if (error || !tasks) {
            return NextResponse.json({ error: 'Gagal mengambil data database' }, { status: 500 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let emailsSent = 0;

        // 2. Cek satu per satu sisa harinya
        for (const task of tasks) {
            const targetDate = new Date(task.due_date);
            targetDate.setHours(0, 0, 0, 0);

            const diffTime = targetDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // 3. Jika H-3 atau H-1, kirim email!
            if (diffDays === 3 || diffDays === 1) {
                const dayText = diffDays === 1 ? "BESOK" : "3 HARI LAGI";

                await resend.emails.send({
                    from: 'NoteNala Reminder <onboarding@resend.dev>', // Menggunakan domain testing bawaan Resend
                    to: myEmail,
                    subject: `🚨 Pengingat Tugas: ${task.title} (Tenggat: ${dayText})`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>Halo! Jangan lupa tugasmu ya! 📚</h2>
                            <p>Tugas <strong>"${task.title}"</strong> memiliki tenggat waktu <strong>${dayText}</strong>.</p>
                            
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <strong>Catatan Tugas:</strong><br/>
                                <p style="white-space: pre-wrap;">${task.note || 'Tidak ada detail catatan.'}</p>
                            </div>
                            
                            <p>Jika sudah selesai dikerjakan, jangan lupa buka <a href="https://nala.my.id">NoteNala</a> dan centang tugasnya agar pengingat ini berhenti!</p>
                            <p>Semangat! 🔥</p>
                        </div>
                    `
                });
                emailsSent++;
            }
        }

        return NextResponse.json({ success: true, message: `Berhasil mengecek. ${emailsSent} email pengingat terkirim.` });

    } catch (error) {
        return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
    }
}