import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json();

    if (!subscription || !userId) {
      return NextResponse.json({ error: "Missing subscription or user ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      }
    );

    // Cek apakah sudah ada subscription untuk device/endpoint ini
    const { data: existingSub } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('subscription->>endpoint', subscription.endpoint)
      .single();

    if (!existingSub) {
      // Masukkan langganan PWA baru ke database
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{ user_id: userId, subscription }]);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: "Subscription saved!" });

  } catch (error: any) {
    console.error("Gagal menyimpan langganan push:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
