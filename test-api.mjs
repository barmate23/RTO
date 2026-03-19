import fetch from 'node-fetch';
const API_URL = 'https://script.google.com/macros/s/AKfycbw8z2SHsLvq3CTyR9LrbNZ5dPyf0-j8Dqmgh9io5AXOuW9atQmpi9z5EMssbQo32YXa9w/exec';
const API_KEY = 'RTO_ACADEMY_2026';

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ apiKey: API_KEY, action: 'getCandidates' }),
})
  .then(res => res.json())
  .then(data => {
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (data.data) items = data.data;
    else if (data.candidates) items = data.candidates;

    console.log('Total items parsed:', items.length);
    const validItems = items.filter(i => (i.name && i.name.trim() !== '') || (i.candidateName && i.candidateName.trim() !== ''));
    console.log('Valid items (with name):', validItems.length);
    if(items.length > 5) {
      console.log('Sample item [4]:', items[4]);
    }
  })
  .catch(console.error);
