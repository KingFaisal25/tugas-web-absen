const { admin } = require('../config/supabaseClients');
const path = require('path');

class TaskService {
  async ensureBucket() {
    try { await admin.storage.createBucket('task_attachments', { public: true }); } catch (_) {}
  }

  async createWithAttachment({ userId, title, description, deadline }, file) {
    await this.ensureBucket();
    let attachmentUrl = null;
    if (file) {
      const ext = path.extname(file.originalname) || '.bin';
      const name = `task_${userId}_${Date.now()}${ext}`;
      const upload = await admin.storage.from('task_attachments').upload(name, file.buffer, { contentType: file.mimetype, upsert: true });
      if (upload.error) throw upload.error;
      attachmentUrl = admin.storage.from('task_attachments').getPublicUrl(name).data.publicUrl;
    }
    const { data, error } = await admin
      .from('tasks')
      .insert([{ user_id: userId, title, description, deadline, attachment_url: attachmentUrl }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = new TaskService();
