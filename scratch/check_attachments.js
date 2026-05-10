const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data: updates, error } = await supabase
    .from('updates')
    .select('*, attachments:update_attachments(*)')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
    return;
  }

  updates.forEach(u => {
    console.log(`Update: ${u.title}`);
    u.attachments.forEach(a => {
      console.log(`  Attachment Type: ${a.type}, URL: ${a.url}`);
    });
  });
}

check();
