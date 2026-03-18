export interface Candidate {
  id: string; // Changed to string
  name: string;
  mobile: string;
  address: string;
  aadhaar: string;
  joiningDate: string;
  courseType: string;
  photo?: string; // Base64 or Blob URL
  status: 'active' | 'completed';
  totalFee: number;
  collectedFee: number;
  serverAttendance?: number;
}

export interface Attendance {
  id?: number;
  candidateId: string;
  date: string; // YYYY-MM-DD
}

export interface Payment {
  id?: number;
  candidateId: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Document {
  id?: number;
  candidateId: string;
  type: 'Aadhaar' | 'Photo' | 'Address Proof' | 'Other';
  name: string;
  data: string; // Base64
  uploadDate: string;
}

