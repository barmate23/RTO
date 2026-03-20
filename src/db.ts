import Dexie, { Table } from 'dexie';
import { Candidate, Attendance, Payment, Document, Car, PetrolRecord } from './types';

export class RTODatabase extends Dexie {
  candidates!: Table<Candidate>;
  attendance!: Table<Attendance>;
  payments!: Table<Payment>;
  documents!: Table<Document>;
  cars!: Table<Car>;
  petrolRecords!: Table<PetrolRecord>;

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
    this.version(3).stores({
      cars: '++id, name, number',
      petrolRecords: '++id, carId, date, carNumber'
    });
  }
}

export const db = new RTODatabase();
