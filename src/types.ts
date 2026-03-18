export interface Candidate {
  id?: number;
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
}

export interface Attendance {
  id?: number;
  candidateId: number;
  date: string; // YYYY-MM-DD
}

export interface Payment {
  id?: number;
  candidateId: number;
  amount: number;
  date: string;
  note?: string;
}

export interface Document {
  id?: number;
  candidateId: number;
  type: 'Aadhaar' | 'Photo' | 'Address Proof' | 'Other';
  name: string;
  data: string; // Base64
  uploadDate: string;
}
