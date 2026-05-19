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
    const { data: userSubs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId);

    const existing = userSubs?.find(s => s.subscription && s.subscription.endpoint === subscription.endpoint);

    if (!existing) {
      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .insert([{
          user_id: userId,
          subscription: subscription,   // objek lengkap { endpoint, keys }
        }]);

      if (error) {
        console.error("Insert error:", error);
        throw error;
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

export async function DELETE(req: Request) {
  try {
    const { endpoint, userId } = await req.json();

    if (!endpoint || !userId) {
      return NextResponse.json({ error: "Missing endpoint or user ID" }, { status: 400 });
    }

    const { data: userSubs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId);

    const existing = userSubs?.find(s => s.subscription && s.subscription.endpoint === endpoint);

    if (existing) {
      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: "Subscription deleted!" });
  } catch (error: any) {
    console.error("Gagal menghapus langganan push:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
