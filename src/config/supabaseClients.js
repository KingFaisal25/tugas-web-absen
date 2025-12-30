require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for auth/user-facing operations (uses anon key)
const client = createClient(supabaseUrl, anonKey);

// Admin client for server-side DB operations (uses service role)
const admin = createClient(supabaseUrl, serviceRoleKey || anonKey);

module.exports = { client, admin };

