require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node scripts/reset-password.js <email> <new_password>');
  process.exit(1);
}

async function resetPassword() {
  console.log(`Resetting password for ${email}...`);
  
  const { data: user, error: findError } = await supabase.auth.admin.listUsers();
  if (findError) {
    console.error('Error finding users:', findError.message);
    return;
  }
  
  const targetUser = user.users.find(u => u.email === email);
  if (!targetUser) {
    console.error('User not found!');
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(
    targetUser.id,
    { password: newPassword }
  );

  if (error) {
    console.error('Error updating password:', error.message);
  } else {
    console.log('✅ Password updated successfully!');
    console.log(`Try logging in with: ${email} / ${newPassword}`);
  }
}

resetPassword();
