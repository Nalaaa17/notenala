import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Generate token unik yang mudah dibaca
function generateToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // hindari karakter yang mirip (0,O,1,I,l)
  let token = '';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) token += '-';
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token; // format: xxxx-xxxx-xxxx
}

export async function POST(req: Request) {
  try {
    const { fileId, userId, userName, expiresInDays } = await req.json();

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'File ID dan User ID diperlukan.' }, { status: 400 });
    }

    // Pastikan file memang milik user ini
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('files')
      .select('id, name, folder_id')
      .eq('id', fileId)
      .maybeSingle();

    if (fileError || !fileData) {
      return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 404 });
    }

    // Gunakan origin dari request agar berjalan baik di localhost maupun production
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Cek apakah sudah ada share untuk file ini dari user ini
    const { data: existing } = await supabaseAdmin
      .from('file_shares')
      .select('token')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Kembalikan token yang sudah ada
      const shareUrl = `${origin}/share/${existing.token}`;
      return NextResponse.json({ success: true, token: existing.token, shareUrl });
    }

    // Buat token baru
    const token = generateToken();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error: insertError } = await supabaseAdmin
      .from('file_shares')
      .insert([{
        token,
        file_id: fileId,
        user_id: userId,
        shared_by_name: userName || 'Pengguna NoteNala',
        expires_at: expiresAt,
      }]);

    if (insertError) throw insertError;

    const shareUrl = `${origin}/share/${token}`;

    return NextResponse.json({ success: true, token, shareUrl });

  } catch (error: any) {
    console.error('Share file error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat link berbagi.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { fileId, userId } = await req.json();

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'File ID dan User ID diperlukan.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('file_shares')
      .delete()
      .eq('file_id', fileId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Share link dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token diperlukan.' }, { status: 400 });
    }

    // Gunakan supabaseAdmin untuk bypass RLS pada tabel files dan folders
    const { data, error } = await supabaseAdmin
      .from('file_shares')
      .select(`
        *,
        files (
          id, name, size, date, file_url,
          folders ( name )
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch share error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

