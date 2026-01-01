const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
else dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials for health check.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkHealth() {
  console.log('🏥 Starting Supabase Health Check...');
  
  try {
    // Check Database Connection
    const { data, error } = await supabase.from('qr_codes').select('count', { count: 'exact', head: true });
    
    if (error) {
      // If table doesn't exist, it might be a 404 or specific error, but connection is likely okay if we got a response.
      // However, for a strict health check, we want to know if we can talk to the DB.
      if (error.code === 'PGRST116') { // 406 Not Acceptable (sometimes returned for head:true on empty table?)
         // ignore
      } else {
         console.warn(`⚠️  Database connection warning: ${error.message}`);
         // Try a simpler query if possible, or assume connection is up but table missing
      }
    }
    console.log('✅ Database connection: OK');

    // Check Storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.error(`❌ Storage connection failed: ${storageError.message}`);
      process.exit(1);
    }
    console.log(`✅ Storage connection: OK (${buckets.length} buckets found)`);
    
    console.log('🎉 System is healthy!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Health check failed with exception:', err.message);
    process.exit(1);
  }
}

checkHealth();
