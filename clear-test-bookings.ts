import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTestBookings() {
  console.log('Clearing test bookings...');
  
  // Delete bookings where the customer name contains "test" or "James" (from the screenshot)
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .or('customer_name.ilike.%test%,customer_name.ilike.%James%');
    
  if (error) {
    console.error('Error clearing bookings:', error);
  } else {
    console.log('Successfully cleared test bookings from the database.');
  }
}

clearTestBookings();
