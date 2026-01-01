require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listUsers() {
  console.log('Listing users...');
  
  // List Auth Users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }
  
  console.log(`Found ${users.length} users in Auth:`);
  users.forEach(u => console.log(` - ${u.email} (Verified: ${u.email_confirmed_at ? 'Yes' : 'No'})`));

  // List Public Profiles
  const { data: profiles, error: dbError } = await supabase
    .from('users')
    .select('email, role, full_name');
    
  if (dbError) {
    console.error('Error fetching profiles:', dbError);
    return;
  }

  console.log(`\nFound ${profiles.length} profiles in public.users:`);
  profiles.forEach(p => console.log(` - ${p.email} (${p.role}) - ${p.full_name}`));
}

listUsers();
