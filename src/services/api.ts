import { Candidate, PetrolRecord } from '../types';
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
  // Must use text/plain to avoid CORS preflight — Google Apps Script does not handle OPTIONS requests.
  // The body is still valid JSON; GAS parses it with JSON.parse(e.postData.contents).
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      apiKey: API_KEY,
      action: 'addCandidate',
      name: candidate.name,
      phone: candidate.mobile,
      address: candidate.address,
      aadhaar: candidate.aadhaar,
      joinDate: candidate.joiningDate,
      course: candidate.courseType,  // e.g. "LMV", "MCWG", "MCWOG", "HMV"
      totalFee: candidate.totalFee,
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

    const validItems = items.filter((item: any) => {
      const name = String(item.name || item.candidateName || '').trim();
      const phone = String(item.phone || item.mobile || '').trim();
      return name !== '' || phone !== '';
    });

    return validItems.map((item: any) => {
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

export async function getDashboardData(): Promise<{ totalCandidates: number; completed: number; active: number; pendingFee: number }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      apiKey: API_KEY,
      action: 'getDashboard'
    }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.json();
}

export async function markAttendanceOnServer(candidateId: string): Promise<{ success: boolean; message: string; total?: number }> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'markAttendance',
        candidateId
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Server returns {"error": "..."} or {"message": "Attendance Marked", "total": 1}
    if (data.error) {
      return { success: false, message: data.error };
    }
    
    return { 
      success: true, 
      message: data.message || "Attendance Marked",
      total: data.total
    };
  } catch (error: any) {
    console.error('Attendance error:', error);
    return { success: false, message: error.message || 'Server connection failed' };
  }
}


export async function uploadDocumentToServer(candidateId: string, fileName: string, mimeType: string, file: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'uploadDocument',
        candidateId,
        fileName,
        mimeType,
        file,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

export async function deleteCandidateFromServer(candidateId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'deleteCandidate',
        candidateId,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}

export async function addPaymentToServer(candidateId: string, totalFee: number, amount: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'addPayment',
        candidateId,
        totalFee,
        amount,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Payment failed:', error);
    throw error;
  }
}


export async function getCandidateDetailsFromServer(candidateId: string): Promise<any> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'getCandidateDetails',
        candidateId,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Get details failed:', error);
    throw error;
  }
}

export async function getPaymentsByCandidateId(candidateId: string): Promise<any> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'getPaymentsByCandidateId',
        candidateId,
      }),
    });
    if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Get payments failed:', error);
    throw error;
  }
}

export async function updateCandidateToServer(candidateId: string, updates: Partial<Candidate>): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'updateCandidate',
        candidateId,
        name: updates.name,
        phone: updates.mobile,
        address: updates.address,
        aadhaar: updates.aadhaar,
        course: updates.courseType,
        totalFee: updates.totalFee,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as { success: boolean; message: string };
  } catch (error) {
    console.error('Update candidate failed:', error);
    throw error;
  }
}

export async function addPetrolRecordToServer(record: PetrolRecord): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'addPetrolRecord',
        date: record.date,
        liters: record.liters,
        amount: record.amount,
        carNumber: record.carNumber,
        carName: record.carName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as { success: boolean; message: string };
  } catch (error) {
    console.error('Add petrol record failed:', error);
    throw error;
  }
}

export async function fetchPetrolRecordsFromServer(): Promise<PetrolRecord[]> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        apiKey: API_KEY,
        action: 'getPetrolRecords'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    let records: any[] = [];
    if (Array.isArray(rawData)) {
      records = rawData;
    } else if (rawData && typeof rawData === 'object' && Array.isArray(rawData.data)) {
      records = rawData.data;
    }

    return records.map((item: any) => ({
      id: String(item.id || item.recordId || Math.random()),
      carId: String(item.carId || ''),
      carName: String(item.carName || ''),
      carNumber: String(item.carNumber || ''),
      date: item.date || '',
      liters: Number(item.liters || 0),
      amount: Number(item.amount || 0),
    }));
  } catch (error) {
    console.error('Error fetching petrol records:', error);
    throw error;
  }
}
