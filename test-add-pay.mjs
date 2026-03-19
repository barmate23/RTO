import fetch from 'node-fetch';
const API_URL = 'https://script.google.com/macros/s/AKfycbw8z2SHsLvq3CTyR9LrbNZ5dPyf0-j8Dqmgh9io5AXOuW9atQmpi9z5EMssbQo32YXa9w/exec';
const API_KEY = 'RTO_ACADEMY_2026';

async function test() {
  const addRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ apiKey: API_KEY, action: 'addPayment', candidateId: 'C1773901080279', totalFee: 3000, amount: 500 }),
  }).then(r => r.json());
  console.log('Add Payment Res:', addRes);

  const getRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ apiKey: API_KEY, action: 'getPaymentsByCandidateId', candidateId: 'C1773901080279' }),
  }).then(r => r.json());
  console.log('Get Payments Res:', getRes);
}
test();
