const { admin } = require('../config/supabaseClients');

class UserService {
  async updateProfileByEmail(email, fields) {
    const { error } = await admin
      .from('users')
      .update({
        phone: fields.phone || null,
        program_studi: fields.programStudi || null,
        photo_url: fields.photoUrl || null,
        nidn: fields.nidn || null,
        npm: fields.npm || null,
      })
      .eq('email', email);
    if (error) throw error;
    const { data, error: fetchErr } = await admin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (fetchErr) throw fetchErr;
    return data;
  }

  async uploadProfilePhoto(buffer, mimetype, email) {
    const fileName = `profile_${email}_${Date.now()}.png`;
    const up = await admin.storage.from('profiles').upload(fileName, buffer, { contentType: mimetype, upsert: true });
    if (up.error) throw up.error;
    const publicUrl = admin.storage.from('profiles').getPublicUrl(fileName).data.publicUrl;
    return publicUrl;
  }
}

module.exports = new UserService();
