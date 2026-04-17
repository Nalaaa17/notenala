import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Gunakan service role key agar bisa tulis tanpa RLS block
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json();

    if (!subscription || !userId) {
      return NextResponse.json({ error: "Missing subscription or user ID" }, { status: 400 });
    }

    if (!subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    // Cek apakah endpoint ini sudah tersimpan
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .insert([{
          user_id: userId,
          subscription: subscription,   // objek lengkap { endpoint, keys }
          endpoint: subscription.endpoint, // kolom terpisah untuk query cepat
        }]);

      if (error) {
        console.error("Insert error:", error);
        // Fallback: coba tanpa kolom endpoint terpisah (kalau kolom itu belum ada)
        const { error: error2 } = await supabaseAdmin
          .from('push_subscriptions')
          .insert([{ user_id: userId, subscription: subscription }]);
        if (error2) throw error2;
      }
    } else {
      // Update subscription (keys bisa berubah setelah browser refresh)
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ subscription: subscription })
        .eq('id', existing.id);
    }

    return NextResponse.json({ success: true, message: "Subscription saved!" });

  } catch (error: any) {
    console.error("Gagal menyimpan langganan push:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
