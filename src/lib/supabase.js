import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ezxsfbreutozuatsqdho.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6eHNmYnJldXRvenVhdHNxZGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjEzNjEsImV4cCI6MjA5MDg5NzM2MX0.y9oNlRFnK18lREUaRcijZd7hbqIVPm1Wz43P1gu2XEU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
