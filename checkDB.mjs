import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntpjkcmznuxctxcrqzlb.supabase.co';
const supabaseKey = 'sb_publishable_ltBjBc0NK2s8Od_Xd_S-6g_Elulg-rM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tasks } = await supabase.from('tasks').select('*');
  console.log("Tasks found:", tasks?.length || 0);
  
  const { data: usersInfo, error: uErr } = await supabase.rpc('get_user_emails_for_cron');
  console.log("RPC Users:", usersInfo?.length || 0, "Error:", uErr?.message);
  
  const { data: subs, error: sErr } = await supabase.from('push_subscriptions').select('*');
  console.log("Subscriptions directly:", subs?.length || 0, "Error:", sErr?.message);

  if (tasks && tasks.length) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(tasks[0].due_date);
    targetDate.setHours(0,0,0,0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log("Sample Task Due Date:", tasks[0].due_date, "Diff Days:", diffDays);
  }
}

check();
