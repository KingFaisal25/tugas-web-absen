import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL)
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY)
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? String(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) : undefined

export const client = createClient(supabaseUrl, anonKey)
export const admin = createClient(supabaseUrl, serviceRoleKey || anonKey)
