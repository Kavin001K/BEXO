import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './artifacts/bexo/.env' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, avatar_url')
    .eq('handle', 'kavink')
    .single()
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Profile Data:', JSON.stringify(data, null, 2))
  }
}

check()
