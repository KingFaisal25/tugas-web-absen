const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authService = require('./src/services/AuthService');
const attendanceService = require('./src/services/AttendanceService');
let aiService;
try {
  aiService = require('./src/services/AIService');
} catch {
  aiService = {
    async generateTaskInsight() { return 'AI Service unavailable.'; },
    async summarizeContent() { return 'AI Service unavailable.'; },
  };
}
const supabase = require('./src/config/supabase'); // Direct access for simple CRUD
const { requireAuth } = require('./src/middleware/auth');
const qrService = require('./src/services/QRService');
const taskService = require('./src/services/TaskService');
const userService = require('./src/services/UserService');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve frontend

// --- AUTH SERVICE ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, role, npm, nidn } = req.body;
    const result = await authService.registerUser(email, password, fullName, role, npm, nidn);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- ATTENDANCE SERVICE ENDPOINTS ---
app.post('/api/attendance/create-session', async (req, res) => {
  try {
    const { courseId, duration } = req.body;
    const session = await attendanceService.createSession(courseId, duration);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/scan', async (req, res) => {
  try {
    const { studentId, sessionToken } = req.body;
    const result = await attendanceService.recordAttendance(studentId, sessionToken);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- TASK SERVICE (Direct CRUD + AI) ---
app.get('/api/tasks', async (req, res) => {
  const { userId } = req.query;
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/tasks', async (req, res) => {
  const { userId, title, description, deadline, priority } = req.body;
  if (!userId || !title?.trim()) return res.status(400).json({ error: 'Invalid payload' });
  if (deadline && isNaN(Date.parse(deadline))) return res.status(400).json({ error: 'Invalid deadline' });
  if (priority && !['low','normal','high'].includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  const { data, error } = await supabase.from('tasks').insert([{
    user_id: userId, title, description, deadline, priority
  }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, deadline, priority } = req.body;
  if (title !== undefined && !String(title).trim()) return res.status(400).json({ error: 'Title required' });
  if (deadline && isNaN(Date.parse(deadline))) return res.status(400).json({ error: 'Invalid deadline' });
  if (priority && !['low','normal','high'].includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  const { data, error } = await supabase.from('tasks').update({
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(deadline !== undefined ? { deadline } : {}),
    ...(priority !== undefined ? { priority } : {}),
  }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Tasks with attachment (multipart)
app.post('/api/tasks/create', requireAuth, upload.single('attachment'), async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    const userId = req.user.id;
    const row = await taskService.createWithAttachment({ userId, title, description, deadline }, req.file);
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- USERS (Minimal endpoint for creating profiles without Supabase Auth) ---
app.post('/api/users', async (req, res) => {
  const { id, email, fullName, role, npm, nidn } = req.body;
  const payload = { 
    email, 
    full_name: fullName, 
    role, 
    npm: role === 'mahasiswa' ? npm : null,
    nidn: role === 'dosen' ? nidn : null
  };
  if (id) Object.assign(payload, { id });
  const { data, error } = await supabase.from('users').insert([payload]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Error fetching user ${id}:`, error);
      if (error.code === 'PGRST116') { // Row not found
         return res.status(404).json({ error: 'User not found' });
      }
      return res.status(500).json({ error: error.message, details: error });
    }
    res.json(data);
  } catch (err) {
    console.error(`Unexpected error fetching user ${id}:`, err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// --- COURSES (Minimal endpoint to enable attendance tests) ---
app.post('/api/courses', async (req, res) => {
  const { code, name, dosenId } = req.body;
  const { data, error } = await supabase.from('courses').insert([
    { code, name, dosen_id: dosenId }
  ]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/courses', async (req, res) => {
  const { dosenId } = req.query;
  const query = supabase.from('courses').select('*').order('created_at', { ascending: false });
  const { data, error } = dosenId ? await query.eq('dosen_id', dosenId) : await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- ATTENDANCE QUERIES ---
app.get('/api/attendance/sessions', async (req, res) => {
  const { courseId } = req.query;
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/attendance/logs', async (req, res) => {
  const { sessionId } = req.query;
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- ASSIGNMENTS ---
app.get('/api/assignments', async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/assignments', async (req, res) => {
  const { courseId, title, description, deadline, createdBy } = req.body;
  
  const { data, error } = await supabase.from('assignments').insert([{
    course_id: courseId,
    title,
    description,
    due_date: deadline,
    created_by: createdBy,
    status: 'published'
  }]).select().single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- AI SERVICE ENDPOINTS ---
app.post('/api/ai/insight', async (req, res) => {
  try {
    const { tasks } = req.body;
    const insight = await aiService.generateTaskInsight(tasks);
    res.json({ insight });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MATERIALS (Storage only, folder per course) ---
app.post('/api/materials/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!req.file || !courseId) return res.status(400).json({ error: 'Invalid payload' });
    await qrService.ensureBuckets();
    const path = `${courseId}/${Date.now()}_${req.file.originalname}`;
    const up = await supabase.storage.from('materials').upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (up.error) return res.status(500).json({ error: up.error.message });
    const url = supabase.storage.from('materials').getPublicUrl(path).data.publicUrl;
    res.json({ url, path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/materials/list', async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId required' });
    await qrService.ensureBuckets();
    const list = await supabase.storage.from('materials').list(String(courseId), { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (list.error) return res.status(500).json({ error: list.error.message });
    const items = (list.data || []).map(it => ({
      name: it.name,
      url: supabase.storage.from('materials').getPublicUrl(`${courseId}/${it.name}`).data.publicUrl,
      created_at: it.created_at,
      updated_at: it.updated_at,
      size: it.metadata?.size || 0
    }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- VERIFY SERVICE (OTP & face) ---
app.post('/api/verify/send-otp', requireAuth, async (req, res) => {
  const { userId, method } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60000).toISOString();
  const { error } = await supabase.from('verifications').insert([{ user_id: userId, otp_code: otp, otp_expiry: expiry, otp_attempts: 0 }]);
  if (error) return res.status(500).json({ error: error.message });
  if (process.env.NODE_ENV !== 'production') {
    console.log(`OTP (${method}) for ${userId}: ${otp} (expires at ${expiry})`);
  }
  res.json({ success: true, expiry, method });
});

app.post('/api/verify/otp', requireAuth, async (req, res) => {
  const { userId, otp } = req.body;
  const { data, error } = await supabase.from('verifications').select('*').eq('user_id', userId).order('otp_expiry', { ascending: false }).limit(1).single();
  if (error || !data) return res.status(400).json({ error: 'OTP not found' });
  if (new Date() > new Date(data.otp_expiry)) return res.status(400).json({ error: 'OTP expired' });
  if (data.otp_attempts >= 3) return res.status(429).json({ error: 'OTP attempts exceeded' });
  const isMatch = data.otp_code === otp;
  const { error: updErr } = await supabase.from('verifications').update({ otp_attempts: data.otp_attempts + 1, verified_at: isMatch ? new Date().toISOString() : null }).eq('id', data.id);
  if (updErr) return res.status(500).json({ error: updErr.message });
  if (!isMatch) return res.status(400).json({ error: 'Invalid OTP' });
  const { error: userErr } = await supabase.from('users').update({ is_verified: true }).eq('id', userId);
  if (userErr) return res.status(500).json({ error: userErr.message });
  res.json({ success: true });
});

app.post('/api/verify/face', requireAuth, upload.single('faceImage'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No face image' });
    // Store face image
    await qrService.ensureBuckets();
    const fileName = `face_${userId}_${Date.now()}.png`;
    const up = await supabase.storage.from('faces').upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (up.error) return res.status(500).json({ error: up.error.message });
    // Stub similarity
    const similarity = 0.9;
    const { error } = await supabase.from('verifications').insert([{ user_id: userId, face_verified: similarity >= 0.85, face_similarity: similarity, verified_at: new Date().toISOString() }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ verified: similarity >= 0.85, similarity });
  } catch (e) {
    res.status(500).json({ error: 'Face verification failed' });
  }
});

// --- ATTENDANCE: Scan via NPM ---
app.post('/api/attendance/scan-npm', async (req, res) => {
  try {
    const { npm, sessionToken } = req.body;
    if (!npm || !sessionToken) return res.status(400).json({ error: 'Invalid payload' });
    const { data: student, error: userErr } = await supabase.from('users').select('id').eq('npm', npm).single();
    if (userErr || !student) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    const result = await attendanceService.recordAttendance(student.id, sessionToken);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- PROFILE UPDATE (with photo) ---
app.post('/api/users/profile', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    await qrService.ensureBuckets();
    const email = req.user.email;
    let photoUrl = null;
    if (req.file) {
      photoUrl = await userService.uploadProfilePhoto(req.file.buffer, req.file.mimetype, email);
    }
    const { phone, programStudi, nidn, npm } = req.body;
    const updated = await userService.updateProfileByEmail(email, { phone, programStudi, nidn, npm, photoUrl });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- QR SERVICE ---
app.post('/api/qr/generate', requireAuth, async (req, res) => {
  try {
    const { userId, type, data, courseId, settings } = req.body;
    const qr = await qrService.generateQR({ userId, type, data, courseId, settings });
    res.json(qr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/qr/user/:userId', requireAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sort = 'created_at', order = 'desc' } = req.query;
    const result = await qrService.listByUser(req.params.userId, Number(page), Number(pageSize), sort, order);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/qr/:id', requireAuth, async (req, res) => {
  try {
    const out = await qrService.remove(req.params.id);
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.get('/api/health', async (req, res) => {
  try {
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (error) {
      console.error('Health check failed:', error);
      return res.status(503).json({ status: 'error', message: 'Database connection failed', details: error.message });
    }
    res.json({ status: 'ok', message: 'System operational' });
  } catch (err) {
    console.error('Health check exception:', err);
    res.status(503).json({ status: 'error', message: 'System malfunction', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
