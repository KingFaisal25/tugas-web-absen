const https = require('https');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
else dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY');
  process.exit(1);
}

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

async function createBuckets() {
  console.log('🚀 Creating Supabase Storage Buckets...');

  const buckets = [
    { name: 'qr', public: true },
    { name: 'faces', public: false },
    { name: 'profiles', public: true },
    { name: 'materials', public: true }
  ];

  for (const bucket of buckets) {
    try {
      console.log(`📦 Creating bucket: ${bucket.name}...`);

      const url = `${supabaseUrl}/storage/v1/bucket`;
      const response = await makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }, {
        name: bucket.name,
        public: bucket.public
      });

      if (response.statusCode === 200 || response.statusCode === 201) {
        console.log(`   ✅ Created bucket: ${bucket.name}`);
      } else if (response.data?.error?.message?.includes('already exists')) {
        console.log(`   ✅ Bucket ${bucket.name} already exists`);
      } else {
        console.error(`   ❌ Failed to create ${bucket.name}:`, response.data);
      }
    } catch (error) {
      console.error(`   ❌ Error creating ${bucket.name}:`, error.message);
    }
  }

  console.log('✅ Bucket creation completed.');
}

createBuckets();
