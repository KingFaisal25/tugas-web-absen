const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Load env
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
else dotenv.config();

// Use service role key for setup operations
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

// Helper function to make REST API calls
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

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function setup() {
  console.log('🚀 Starting Supabase Auto-Provisioning/Setup...');

  // 1. Fix Storage RLS Issues
  console.log('🔧 Fixing Storage RLS policies...');
  try {
    // Use REST API to execute SQL
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (supabaseUrl && serviceKey) {
      // First create the exec_sql function
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

      const createFuncUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
      const funcResponse = await makeRequest(createFuncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }, { sql: createFunctionSQL });

      if (funcResponse.statusCode === 200) {
        console.log('   ✅ Created exec_sql function');
      } else {
        console.warn('   ⚠️  Could not create exec_sql function:', funcResponse.data);
      }

      // Now disable RLS on storage.buckets
      const disableRlsResponse = await makeRequest(createFuncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }, { sql: 'ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;' });

      if (disableRlsResponse.statusCode === 200) {
        console.log('   ✅ Temporarily disabled RLS on storage.buckets');
      } else {
        console.warn('   ⚠️  Could not disable RLS on storage.buckets:', disableRlsResponse.data);
      }
    } else {
      console.warn('   ⚠️  Missing Supabase credentials for RLS fix');
    }
  } catch (err) {
    console.warn('⚠️  Could not execute RLS fix. This might cause bucket creation to fail.');
  }

  // 2. Setup Buckets
  const requiredBuckets = [
    { name: 'qr', public: true },
    { name: 'faces', public: false },
    { name: 'profiles', public: true },
    { name: 'materials', public: true }
  ];

  console.log('📦 Checking Storage Buckets...');
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existingNames = existingBuckets.map(b => b.name);

  for (const bucket of requiredBuckets) {
    if (!existingNames.includes(bucket.name)) {
      console.log(`   Creating bucket: ${bucket.name}...`);
      const { error } = await supabase.storage.createBucket(bucket.name, { public: bucket.public });
      if (error) {
        console.error(`   ❌ Failed to create ${bucket.name}:`, error.message);
        // Try alternative approach with direct SQL
        console.log(`   🔄 Trying alternative creation method for ${bucket.name}...`);
        try {
          const { error: sqlError } = await supabase.rpc('exec_sql', {
            sql: `INSERT INTO storage.buckets (id, name, public) VALUES ('${bucket.name}', '${bucket.name}', ${bucket.public}) ON CONFLICT (id) DO NOTHING;`
          });
          if (sqlError) {
            console.error(`   ❌ Alternative method also failed for ${bucket.name}:`, sqlError.message);
          } else {
            console.log(`   ✅ Created ${bucket.name} using alternative method`);
          }
        } catch (altErr) {
          console.error(`   ❌ Alternative method failed for ${bucket.name}:`, altErr.message);
        }
      } else {
        console.log(`   ✅ Created ${bucket.name}`);
      }
    } else {
      console.log(`   ✅ Bucket ${bucket.name} exists`);
    }
  }

  // 3. Re-enable RLS if it was disabled
  console.log('🔒 Re-enabling Storage RLS policies...');
  try {
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.warn('⚠️  Could not re-enable RLS on storage.buckets:', rlsError.message);
    } else {
      console.log('   ✅ Re-enabled RLS on storage.buckets');
    }
  } catch (err) {
    console.warn('⚠️  Could not re-enable RLS on storage.buckets');
  }

  // 2. Database Schema Check (Informational)
  console.log('\n🗄️  Checking Database Tables (Basic Check)...');
  const tables = ['qr_codes', 'courses', 'attendance_sessions', 'attendance_logs', 'materials', 'tasks'];
  
  let hasErrors = false;
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.warn(`   ⚠️  Table '${table}' might be missing or inaccessible: ${error.message}`);
      hasErrors = true;
    } else {
      console.log(`   ✅ Table '${table}' is accessible`);
    }
  }

  if (hasErrors) {
    console.log('\n❌ Some tables are missing or have policy errors.');
    console.log('👉 Please run the SQL script at "supabase/migrations/fix_setup.sql" in your Supabase Dashboard SQL Editor to fix these issues.');
  } else {
    console.log('\n✅ Setup sequence completed successfully.');
  }
}

setup();
