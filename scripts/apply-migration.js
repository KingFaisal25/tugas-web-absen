const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
else dotenv.config();

async function applyMigration() {
  console.log('🚀 Applying Supabase Migration...');

  // Get database URL from Supabase URL and service role key
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY');
    process.exit(1);
  }

  // Extract database connection details from Supabase URL
  const url = new URL(supabaseUrl);
  const dbUrl = `postgresql://postgres:${serviceRoleKey}@${url.host}:5432/postgres`;

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read and execute the migration file
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20241220_create_exec_sql_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration applied successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applyMigration();
