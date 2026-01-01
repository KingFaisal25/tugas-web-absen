const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const localEnv = '.env.local';

const envPath = path.resolve(process.cwd(), envFile);
const localEnvPath = path.resolve(process.cwd(), localEnv);

if (fs.existsSync(localEnvPath)) {
  console.log(`Loading environment from ${localEnv}`);
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  console.warn('No environment file found. Using process.env only.');
}

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'SUPABASE_JWT_SECRET'
];

const missing = [];

requiredVars.forEach(key => {
  if (!process.env[key]) {
    missing.push(key);
  }
});

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n⚠️  Development fallback: You can create a .env.local file with these variables.');
    console.log('   Check .env.example for a template.');
  }
  
  process.exit(1);
}

console.log('✅ Environment variables check passed.');
