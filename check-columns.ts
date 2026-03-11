import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkColumns() {
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      console.log('Columns in bookings table:', Object.keys(data[0] || {}));
    }
  } else {
    console.log('Missing credentials');
  }
}

checkColumns();
