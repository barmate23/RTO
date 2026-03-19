import fetch from 'node-fetch';
const API_URL = 'https://script.google.com/macros/s/AKfycbw8z2SHsLvq3CTyR9LrbNZ5dPyf0-j8Dqmgh9io5AXOuW9atQmpi9z5EMssbQo32YXa9w/exec';
const API_KEY = 'RTO_ACADEMY_2026';

async function test() {
  const getRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ apiKey: API_KEY, action: 'getCandidates' }),
  }).then(r => r.json());
  
  const cands = getRes.filter(i => (i.name && i.name.trim() !== '') || (i.candidateName && i.candidateName.trim() !== ''));
  console.log('Candidates:', cands);
}
test();
