async function check() {
  const res = await fetch('http://localhost:3000/api/bookings?date=2026-03-09');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
