const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load env
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
else dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Helper to make raw requests (for creating the function if needed)
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('🚀 Applying RLS Fix...');

  // 1. Ensure exec_sql function exists
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        IF auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Access denied. Only service role can execute this function.';
        END IF;
        EXECUTE sql;
        result := json_build_object('success', true, 'message', 'SQL executed successfully');
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            result := json_build_object('success', false, 'message', SQLERRM);
            RETURN result;
    END;
    $$;
  `;

  const createFuncUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  try {
    await makeRequest(createFuncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    }, { sql: createFunctionSQL });
    console.log('   ✅ exec_sql function ensured');
  } catch (e) {
    console.warn('   ⚠️ Failed to ensure exec_sql function (might already exist or connection error)');
  }

  // 2. Read the SQL file
  const sqlPath = path.join(__dirname, '../supabase/migrations/20250101_simplify_users_policy.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // 3. Execute via RPC
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Failed to apply RLS fix:', error.message);
    // Try raw request fallback
    console.log('   🔄 Trying raw request fallback...');
    const res = await makeRequest(createFuncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    }, { sql });
    
    if (res.statusCode === 200) {
       console.log('   ✅ RLS fix applied successfully (via fallback)');
    } else {
       console.error('   ❌ Fallback also failed:', res.data);
    }
  } else {
    console.log('✅ RLS fix applied successfully:', data);
  }
}

run();
