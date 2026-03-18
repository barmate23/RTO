import { Candidate } from '../types';
import { db } from '../db';

const API_URL = 'https://script.google.com/macros/s/AKfycbw8z2SHsLvq3CTyR9LrbNZ5dPyf0-j8Dqmgh9io5AXOuW9atQmpi9z5EMssbQo32YXa9w/exec';
const API_KEY = 'RTO_ACADEMY_2026';

export async function fetchCandidatesFromServer() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script often requires no-cors or handles redirects
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'getCandidates'
      }),
    });

    // Note: Google Apps Script 'no-cors' mode won't allow reading the body.
    // However, usually these are set up as web apps that return JSON.
    // If it's a standard CORS-enabled endpoint:
    if (response.type === 'opaque') {
        throw new Error('API returned opaque response. CORS might be misconfigured on the server.');
    }

    const data = await response.json();
    return data as Candidate[];
  } catch (error) {
    console.error('Error fetching candidates:', error);
    throw error;
  }
}

// Alternative version if the above fails due to CORS/Redirects common with GAS
export async function syncCandidates() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'getCandidates'
      }),
    });

    const rawData = await response.json();
    console.log('Sync Response:', rawData);
    
    let data: any[] = [];
    if (Array.isArray(rawData)) {
      data = rawData;
    } else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.data)) {
        data = rawData.data;
      } else if (Array.isArray(rawData.candidates)) {
        data = rawData.candidates;
      } else if (rawData.name || rawData.mobile || rawData.candidateName) {
        // It's a single candidate object
        data = [rawData];
      }
    }
    
    let added = 0;
    let updated = 0;

    if (data.length > 0) {
      for (const item of data) {
        // Map fields if they differ from our internal schema
        const candidate: Candidate = {
          name: String(item.name || item.candidateName || item.full_name || 'Unknown'),
          mobile: String(item.mobile || item.phone || item.mobileNumber || ''),
          address: String(item.address || item.location || ''),
          aadhaar: String(item.aadhaar || item.aadhaarNumber || item.id_number || ''),
          joiningDate: item.joiningDate || item.date || new Date().toISOString().split('T')[0],
          courseType: item.courseType || item.course || 'LMW (Light Motor Vehicle)',
          status: item.status || 'active',
          totalFee: Number(item.totalFee || item.fee || 5000),
          collectedFee: Number(item.collectedFee || item.paid || 0),
          photo: item.photo || null
        };

        // Try to find existing candidate by mobile or aadhaar
        let existing = null;
        if (candidate.mobile && candidate.mobile.length > 5) {
          existing = await db.candidates.where('mobile').equals(candidate.mobile).first();
        }
        if (!existing && candidate.aadhaar && candidate.aadhaar.length > 5) {
          existing = await db.candidates.where('aadhaar').equals(candidate.aadhaar).first();
        }
        
        // Final fallback: Name + Mobile combo
        if (!existing && candidate.name !== 'Unknown') {
          existing = await db.candidates
            .where('name').equals(candidate.name)
            .filter(c => c.mobile === candidate.mobile)
            .first();
        }

        // If still not found, it's definitely a new record
        if (existing) {
          await db.candidates.update(existing.id!, candidate);
          updated++;
        } else {
          await db.candidates.add(candidate);
          added++;
        }
      }
      return { total: data.length, added, updated };
    }
    return { total: 0, added: 0, updated: 0 };
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
