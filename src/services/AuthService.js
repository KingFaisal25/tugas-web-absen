const { client, admin } = require('../config/supabaseClients');

class AuthService {
  async login(email, password) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Fetch user role from our custom users table
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (userError) throw userError;

    return { session: data.session, user: userData };
  }

  async registerUser(email, password, fullName, role, npm = null, nidn = null) {
    // 1. Create Auth User (admin: auto-confirm email for development)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) throw error;

    // 2. Create Profile in public.users
    const { error: dbError } = await admin
      .from('users')
      .insert([
        { 
          id: data.user.id,
          email, 
          full_name: fullName, 
          role, 
          npm: role === 'mahasiswa' ? npm : null,
          nidn: role === 'dosen' ? nidn : null
        }
      ]);

    if (dbError) throw dbError;
    const { data: userRow, error: fetchErr } = await admin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (fetchErr) throw fetchErr;
    return { user: userRow };
  }
}

module.exports = new AuthService();
