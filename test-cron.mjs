import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntpjkcmznuxctxcrqzlb.supabase.co';
const supabaseKey = 'sb_publishable_ltBjBc0NK2s8Od_Xd_S-6g_Elulg-rM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('push_subscriptions').insert([
    { user_id: 'a05f0370-d72b-4fa9-b844-3151eb42efdb', subscription: { endpoint: "test" } }
  ]);
  console.log("Error:", error);
  console.log("Data:", data);
}

check();
