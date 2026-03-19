import Dexie, { Table } from 'dexie';
import { Candidate, Attendance, Payment, Document } from './types';

export class RTODatabase extends Dexie {
  candidates!: Table<Candidate>;
  attendance!: Table<Attendance>;
  payments!: Table<Payment>;
  documents!: Table<Document>;

  constructor() {
    super('RTOTrainingDB');
    this.version(1).stores({
      candidates: '++id, name, mobile, aadhaar, status',
      attendance: '++id, candidateId, date',
      payments: '++id, candidateId, date',
      documents: '++id, candidateId, type'
    });
    this.version(2).stores({
      candidates: '++id, externalId, name, mobile, aadhaar, status',
    });
  }
}

export const db = new RTODatabase();
