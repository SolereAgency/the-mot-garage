import { createClient } from '@supabase/supabase-js';

// Read from process.env which will be populated if we run this via the server
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  async function clear() {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .or('customer_name.ilike.%test%,customer_name.ilike.%James%');
    console.log('Cleared test bookings:', error || 'Success');
  }
  clear();
}
