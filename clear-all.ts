async function clearAll() {
  try {
    const res = await fetch('http://localhost:3000/api/clear-all-bookings');
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
clearAll();
