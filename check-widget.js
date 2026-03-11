const res = await fetch('https://chat-widget.retellai.com/widget.js');
const text = await res.text();
console.log(text.substring(0, 500));
