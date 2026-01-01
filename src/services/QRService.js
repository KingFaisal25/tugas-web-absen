const { admin } = require('../config/supabaseClients');
const crypto = require('crypto');
const QRCode = require('qrcode');

class QRService {
  async ensureBuckets() {
    // Create buckets if not exist
    try { await admin.storage.createBucket('qr', { public: true }); } catch (_) {}
    try { await admin.storage.createBucket('faces', { public: false }); } catch (_) {}
    try { await admin.storage.createBucket('profiles', { public: true }); } catch (_) {}
    try { await admin.storage.createBucket('materials', { public: true }); } catch (_) {}
  }

  encryptData(payload, secret) {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(secret).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex')
    };
  }

  decryptData(encryptedPayload, secret) {
    try {
      const iv = Buffer.from(encryptedPayload.iv, 'hex');
      const tag = Buffer.from(encryptedPayload.tag, 'hex');
      const encryptedText = Buffer.from(encryptedPayload.data, 'hex');
      const key = crypto.createHash('sha256').update(secret).digest();
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  async generateQR({ userId, type, data, courseId, settings = {} }) {
    await this.ensureBuckets();

    const secret = process.env.QR_SECRET || 'default-secret';
    let finalType = type;
    if (courseId) finalType = 'class';
    if (finalType === 'class' && !courseId) throw new Error('courseId required for class QR');

    let courseMeta = null;
    if (courseId) {
      const { data: course, error: courseErr } = await admin
        .from('courses')
        .select('id, code, name')
        .eq('id', courseId)
        .single();
      if (courseErr || !course) throw new Error('Course not found');
      courseMeta = { id: course.id, code: course.code, name: course.name };
    }

    const widthNum = Number(settings.width || 500);
    const clampedWidth = Math.max(128, Math.min(1024, Number.isFinite(widthNum) ? widthNum : 500));
    const payload = { userId, type: finalType, data, course: courseMeta, settings: { ...settings, width: clampedWidth } };
    const encrypted = this.encryptData(payload, secret);

    const qrPayload = JSON.stringify({ v: 1, enc: encrypted });
    const pngBuffer = await QRCode.toBuffer(qrPayload, { width: clampedWidth, errorCorrectionLevel: 'M' });

    const { data: inserted, error } = await admin
      .from('qr_codes')
      .insert([{ 
        user_id: userId,
        type: finalType,
        encrypted_data: JSON.stringify(encrypted),
        is_private: !!settings.is_private,
        expiry_date: settings.expiry_date || null,
        scan_limit: settings.scan_limit || 1000
      }])
      .select()
      .single();
    if (error) throw error;

    const fileName = `qr_${inserted.id}.png`;
    const upload = await admin.storage.from('qr').upload(fileName, pngBuffer, { contentType: 'image/png', upsert: true });
    if (upload.error) throw upload.error;
    const publicUrl = admin.storage.from('qr').getPublicUrl(fileName).data.publicUrl;

    const { error: updErr } = await admin.from('qr_codes').update({ image_url: publicUrl }).eq('id', inserted.id);
    if (updErr) throw updErr;

    return { ...inserted, image_url: publicUrl };
  }

  async listByUser(userId, page = 1, pageSize = 10, sort = 'created_at', order = 'desc') {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await admin
      .from('qr_codes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order(sort, { ascending: order === 'asc' })
      .range(from, to);
    if (error) throw error;

    const secret = process.env.QR_SECRET || 'default-secret';
    const items = data.map(item => {
      let courseName = null;
      if (item.encrypted_data) {
        try {
          const enc = JSON.parse(item.encrypted_data);
          const decrypted = this.decryptData(enc, secret);
          if (decrypted && decrypted.course && decrypted.course.name) {
            courseName = decrypted.course.name;
          }
        } catch (e) {
          // ignore parsing/decryption errors
        }
      }
      return { ...item, course_name: courseName };
    });

    return { items, total: count, page };
  }

  async remove(id) {
    const { data, error } = await admin.from('qr_codes').select('image_url').eq('id', id).single();
    if (error) throw error;
    if (data?.image_url) {
      const path = data.image_url.split('/').pop();
      await admin.storage.from('qr').remove([path]);
    }
    const { error: delErr } = await admin.from('qr_codes').delete().eq('id', id);
    if (delErr) throw delErr;
    return { success: true };
  }
}

module.exports = new QRService();
