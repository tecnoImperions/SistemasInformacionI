import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data, error } = await supabase.from('clientes').select('*').limit(1)
  console.log('Error:', error)
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data')
}

check()
