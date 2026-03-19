import { Candidate } from '../types';
import { db } from '../db';
import { format, subDays } from 'date-fns';


const API_URL = 'https://script.google.com/macros/s/AKfycbw8z2SHsLvq3CTyR9LrbNZ5dPyf0-j8Dqmgh9io5AXOuW9atQmpi9z5EMssbQo32YXa9w/exec';
const API_KEY = 'RTO_ACADEMY_2026';

/**
 * Saves a new candidate to the Google Apps Script backend.
 * Maps internal field names to what the API expects:
 *   mobile      → phone
 *   joiningDate → joinDate
 *   courseType  → course
 */
export async function addCandidateToServer(candidate: Candidate): Promise<{ success: boolean; message: string }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: API_KEY,
      action: 'addCandidate',
      name: candidate.name,
      phone: candidate.mobile,
      address: candidate.address,
      aadhaar: candidate.aadhaar,
      joinDate: candidate.joiningDate,
      course: candidate.courseType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as { success: boolean; message: string };
}

export async function fetchCandidatesFromServer() {
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('API Response:', rawData);

    let items: any[] = [];
    if (Array.isArray(rawData)) {
      items = rawData;
    } else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.data)) items = rawData.data;
      else if (Array.isArray(rawData.candidates)) items = rawData.candidates;
      else if (rawData.status === 'success' && rawData.data) items = Array.isArray(rawData.data) ? rawData.data : [rawData.data];
    }

    return items.map(item => {
      // Map based on the NEW structure shared by the user
      const candidate: Candidate = {
        id: String(item.candidateId || item.id || `temp-${Math.random()}`),
        name: String(item.name || item.candidateName || 'Unknown'),
        mobile: String(item.phone || item.mobile || ''),
        address: String(item.address || ''),
        aadhaar: String(item.aadhaar || ''),
        joiningDate: item.joiningDate || new Date().toISOString().split('T')[0],
        courseType: item.courseType || 'LMW (Light Motor Vehicle)',
        status: (item.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed',
        totalFee: Number(item.fees?.totalFee || item.totalFee || 5000),
        collectedFee: Number(item.fees?.paid || item.collectedFee || item.paid || 0),
        serverAttendance: Number(item.attendance?.completed || item.attendance || 0),
        photo: item.photo || null
      };
      return candidate;
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    throw error;
  }
}



