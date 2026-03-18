import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  CalendarCheck, 
  IndianRupee, 
  Search,
  ChevronRight,
  Plus,
  ArrowLeft,
  Camera,
  FileText,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { db } from './db';
import { Candidate, Attendance, Payment, Document } from './types';
import { cn, formatCurrency } from './utils';

// --- Components ---

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'candidates', icon: Users, label: 'Candidates' },
    { id: 'attendance', icon: CalendarCheck, label: 'Attendance' },
    { id: 'fees', icon: IndianRupee, label: 'Fees' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50 safe-area-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors duration-200",
            activeTab === tab.id ? "text-blue-600" : "text-slate-400"
          )}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const Header = ({ title, showBack, onBack }: { title: string, showBack?: boolean, onBack?: () => void }) => (
  <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 px-6 py-4 flex items-center gap-4 border-b border-slate-100">
    {showBack && (
      <button onClick={onBack} className="p-1 -ml-1 text-slate-600">
        <ArrowLeft size={24} />
      </button>
    )}
    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
  </header>
);

import { syncCandidates } from './services/api';

// --- Screens ---

const Dashboard = ({ onNavigate, showToast }: { onNavigate: (screen: string, params?: any) => void, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const candidates = useLiveQuery(() => db.candidates.toArray()) || [];
  const payments = useLiveQuery(() => db.payments.toArray()) || [];

  const stats = {
    total: candidates.length,
    active: candidates.filter(c => c.status === 'active').length,
    completed: candidates.filter(c => c.status === 'completed').length,
    pendingFee: candidates.reduce((acc, c) => acc + (c.totalFee - c.collectedFee), 0),
  };

  useEffect(() => {
    const checkAndSync = async () => {
      const count = await db.candidates.count();
      if (count === 0) {
        handleSync();
      }
    };
    checkAndSync();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCandidates();
      if (result.total > 0) {
        showToast(`Sync: ${result.added} new, ${result.updated} updated`, 'success');
      } else {
        showToast('Sync complete. No candidates found.', 'success');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      showToast('Sync failed. Check connection or API key.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-lg font-bold opacity-80">Welcome Back</h2>
          <p className="text-2xl font-bold mt-1">RTO Training Center</p>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              "mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white text-blue-600 shadow-lg active:scale-95",
              isSyncing && "opacity-70 pointer-events-none"
            )}
          >
            <Clock size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Syncing Data...' : 'Sync from Server'}
          </button>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <LayoutDashboard size={120} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <Users className="text-blue-600 mb-2" size={24} />
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Candidates</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <CheckCircle2 className="text-emerald-600 mb-2" size={24} />
          <div className="text-2xl font-bold text-emerald-900">{stats.completed}</div>
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Completed</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
          <Clock className="text-orange-600 mb-2" size={24} />
          <div className="text-2xl font-bold text-orange-900">{stats.active}</div>
          <div className="text-xs font-medium text-orange-600 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
          <IndianRupee className="text-rose-600 mb-2" size={24} />
          <div className="text-xl font-bold text-rose-900">{formatCurrency(stats.pendingFee)}</div>
          <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">Pending Fee</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Recent Candidates</h2>
          <button onClick={() => onNavigate('candidates')} className="text-blue-600 text-sm font-medium">View All</button>
        </div>
        <div className="space-y-3">
          {candidates.slice(-3).reverse().map(candidate => (
            <div 
              key={candidate.id} 
              onClick={() => onNavigate('profile', { id: candidate.id })}
              className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                {candidate.photo ? <img src={candidate.photo} alt="" className="w-full h-full object-cover" /> : <Users size={24} />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{candidate.name}</div>
                <div className="text-xs text-slate-500">{candidate.courseType} • Joined {format(parseISO(candidate.joiningDate), 'MMM d, yyyy')}</div>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic">No candidates added yet.</div>
          )}
        </div>
      </div>

      <button 
        onClick={() => onNavigate('add-candidate')}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
      >
        <UserPlus size={20} />
        Add New Candidate
      </button>
    </div>
  );
};

const CandidateList = ({ onNavigate, showToast }: { onNavigate: (screen: string, params?: any) => void, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const candidates = useLiveQuery(() => 
    db.candidates.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.mobile.includes(search)
    ).toArray(),
    [search]
  ) || [];

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCandidates();
      if (result.total > 0) {
        showToast(`Sync: ${result.added} new, ${result.updated} updated`, 'success');
      } else {
        showToast('Sync complete. No candidates found.', 'success');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      showToast('Sync failed. Check connection or API key.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-slate-900">All Candidates ({candidates.length})</h2>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              isSyncing ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 active:scale-95"
            )}
          >
            <Clock size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or mobile..." 
            className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {candidates.map(candidate => (
            <div 
              key={candidate.id} 
              onClick={() => onNavigate('profile', { id: candidate.id })}
              className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                {candidate.photo ? <img src={candidate.photo} alt="" className="w-full h-full object-cover" /> : <Users size={24} />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{candidate.name}</div>
                <div className="text-xs text-slate-500">{candidate.mobile}</div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                candidate.status === 'active' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {candidate.status}
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <p className="text-slate-400">No candidates found.</p>
              {!isSyncing && (
                <button 
                  onClick={handleSync}
                  className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold flex items-center gap-2 mx-auto active:scale-95 transition-all"
                >
                  <Clock size={18} />
                  Sync from Server
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <button 
        onClick={() => onNavigate('add-candidate')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform z-40"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

const AddCandidate = ({ onBack, editId, showToast }: { onBack: () => void, editId?: number, showToast: (m: string) => void }) => {
  const [formData, setFormData] = useState<Partial<Candidate>>({
    name: '',
    mobile: '',
    address: '',
    aadhaar: '',
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    courseType: 'LMW (Light Motor Vehicle)',
    totalFee: 5000,
    collectedFee: 0,
    status: 'active'
  });

  useEffect(() => {
    if (editId) {
      db.candidates.get(editId).then(candidate => {
        if (candidate) setFormData(candidate);
      });
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await db.candidates.update(editId, formData);
      showToast('Candidate updated successfully');
    } else {
      await db.candidates.add(formData as Candidate);
      showToast('Candidate added successfully');
    }
    onBack();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="pb-24">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-slate-200 relative">
            {formData.photo ? (
              <img src={formData.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={32} />
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tap to upload photo</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
            <input 
              required
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
            <input 
              required
              type="tel" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aadhaar Number</label>
            <input 
              required
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.aadhaar}
              onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
            <textarea 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joining Date</label>
              <input 
                required
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fee</label>
              <input 
                required
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.totalFee}
                onChange={(e) => setFormData({ ...formData, totalFee: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Type</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.courseType}
              onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
            >
              <option>LMW (Light Motor Vehicle)</option>
              <option>MCWG (Motorcycle with Gear)</option>
              <option>MCWOG (Motorcycle without Gear)</option>
              <option>HMV (Heavy Motor Vehicle)</option>
            </select>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-transform"
        >
          {editId ? 'Update Candidate' : 'Save Candidate'}
        </button>
      </form>
    </div>
  );
};

const CandidateProfile = ({ id, onNavigate, onBack, showConfirm, showToast }: { id: number, onNavigate: (screen: string, params?: any) => void, onBack: () => void, showConfirm: (t: string, m: string, c: () => void) => void, showToast: (m: string) => void }) => {
  const candidate = useLiveQuery(() => db.candidates.get(id), [id]);
  const attendance = useLiveQuery(() => db.attendance.where('candidateId').equals(id).toArray(), [id]) || [];
  const documents = useLiveQuery(() => db.documents.where('candidateId').equals(id).toArray(), [id]) || [];

  if (!candidate) return null;

  const attendanceCount = attendance.length;
  const progress = Math.min((attendanceCount / 25) * 100, 100);
  const remainingFee = candidate.totalFee - candidate.collectedFee;

  const handleDelete = () => {
    showConfirm(
      'Delete Candidate',
      'Are you sure you want to delete this candidate? All data will be lost.',
      async () => {
        await db.candidates.delete(id);
        await db.attendance.where('candidateId').equals(id).delete();
        await db.payments.where('candidateId').equals(id).delete();
        await db.documents.where('candidateId').equals(id).delete();
        showToast('Candidate deleted');
        onBack();
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pb-24 print:pb-0">
      <div className="p-6 space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-slate-200">
            {candidate.photo ? <img src={candidate.photo} alt="" className="w-full h-full object-cover" /> : <Users size={40} />}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{candidate.name}</h2>
            <p className="text-slate-500 font-medium">{candidate.mobile}</p>
            <div className="mt-2 flex gap-2 print:hidden">
              <button 
                onClick={() => onNavigate('add-candidate', { editId: id })}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg uppercase tracking-wider"
              >
                Edit
              </button>
              <button 
                onClick={handleDelete}
                className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg uppercase tracking-wider"
              >
                Delete
              </button>
              <button 
                onClick={handlePrint}
                className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-wider"
              >
                Report
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Course Progress</h3>
            <span className="text-sm font-bold text-blue-600">{attendanceCount} / 25 Days</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden print:hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-blue-600"
            />
          </div>
          <p className="text-xs text-slate-500">Course automatically completes at 25 days of attendance.</p>
        </div>

        {/* Fee Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900">Fee Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(candidate.totalFee)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining</div>
              <div className="text-lg font-bold text-rose-600">{formatCurrency(remainingFee)}</div>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('fees', { candidateId: id })}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform print:hidden"
          >
            Manage Payments
          </button>
        </div>

        {/* Quick Info */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Details</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aadhaar</div>
              <div className="text-sm font-medium text-slate-900">{candidate.aadhaar}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course</div>
              <div className="text-sm font-medium text-slate-900">{candidate.courseType}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</div>
              <div className="text-sm font-medium text-slate-900">{candidate.address}</div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-4 print:hidden">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Documents</h3>
            <button 
              onClick={() => onNavigate('documents', { candidateId: id })}
              className="text-blue-600 text-sm font-bold"
            >
              Add New
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{doc.type}</div>
                  <div className="text-[10px] text-slate-400">{format(parseISO(doc.uploadDate), 'MMM d')}</div>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="col-span-2 text-center py-4 text-slate-400 text-xs italic">No documents uploaded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendanceScreen = ({ candidateId, showToast }: { candidateId?: number, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(candidateId || null);
  const candidates = useLiveQuery(() => db.candidates.where('status').equals('active').toArray()) || [];
  const attendance = useLiveQuery(() => 
    selectedCandidateId ? db.attendance.where('candidateId').equals(selectedCandidateId).toArray() : Promise.resolve([]),
    [selectedCandidateId]
  ) || [];

  const handleMarkAttendance = async () => {
    if (!selectedCandidateId) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = await db.attendance.where({ candidateId: selectedCandidateId, date: today }).first();
    
    if (existing) {
      showToast('Attendance already marked for today', 'error');
      return;
    }

    await db.attendance.add({ candidateId: selectedCandidateId, date: today });
    
    // Check for completion
    const count = await db.attendance.where('candidateId').equals(selectedCandidateId).count();
    if (count >= 25) {
      await db.candidates.update(selectedCandidateId, { status: 'completed' });
      showToast('Course Completed! 25 days reached');
    } else {
      showToast('Attendance marked successfully');
    }
  };

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Candidate</label>
        <select 
          className="w-full bg-slate-100 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
          value={selectedCandidateId || ''}
          onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
        >
          <option value="">Choose a candidate...</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCandidateId ? (
        <>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{format(today, 'MMMM yyyy')}</h3>
              <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                {attendance.length} / 25 Days
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
              ))}
              {days.map(day => {
                const isMarked = attendance.some(a => isSameDay(parseISO(a.date), day));
                const isToday = isSameDay(day, today);
                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                      isMarked ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400",
                      isToday && !isMarked && "ring-2 ring-blue-500 ring-offset-2"
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>

          <button 
            onClick={handleMarkAttendance}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            Mark Today's Attendance
          </button>
        </>
      ) : (
        <div className="text-center py-20 text-slate-400 italic">
          Select an active candidate to view and mark attendance.
        </div>
      )}
    </div>
  );
};

const FeesScreen = ({ candidateId, showToast }: { candidateId?: number, showToast: (m: string) => void }) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(candidateId || null);
  const [amount, setAmount] = useState('');
  const candidates = useLiveQuery(() => db.candidates.toArray()) || [];
  const selectedCandidate = useLiveQuery(() => selectedCandidateId ? db.candidates.get(selectedCandidateId) : Promise.resolve(null), [selectedCandidateId]);
  const payments = useLiveQuery(() => 
    selectedCandidateId ? db.payments.where('candidateId').equals(selectedCandidateId).reverse().toArray() : Promise.resolve([]),
    [selectedCandidateId]
  ) || [];

  const handleAddPayment = async () => {
    if (!selectedCandidateId || !amount || !selectedCandidate) return;
    
    const paymentAmount = Number(amount);
    await db.payments.add({
      candidateId: selectedCandidateId,
      amount: paymentAmount,
      date: new Date().toISOString(),
    });

    await db.candidates.update(selectedCandidateId, {
      collectedFee: selectedCandidate.collectedFee + paymentAmount
    });

    setAmount('');
    showToast('Payment recorded successfully');
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Candidate</label>
        <select 
          className="w-full bg-slate-100 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
          value={selectedCandidateId || ''}
          onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
        >
          <option value="">Choose a candidate...</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCandidate ? (
        <>
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Remaining Balance</div>
                <div className="text-3xl font-bold mt-1">{formatCurrency(selectedCandidate.totalFee - selectedCandidate.collectedFee)}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <IndianRupee size={24} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fee</div>
                <div className="text-sm font-bold">{formatCurrency(selectedCandidate.totalFee)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected</div>
                <div className="text-sm font-bold text-emerald-400">{formatCurrency(selectedCandidate.collectedFee)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Add Payment</h3>
            <div className="flex gap-3">
              <input 
                type="number" 
                placeholder="Amount"
                className="flex-1 bg-slate-100 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button 
                onClick={handleAddPayment}
                className="bg-blue-600 text-white px-6 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Payment History</h3>
            <div className="space-y-3">
              {payments.map(payment => (
                <div key={payment.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">{formatCurrency(payment.amount)}</div>
                    <div className="text-xs text-slate-400">{format(parseISO(payment.date), 'MMM d, yyyy • h:mm a')}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-sm">No payment history found.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-slate-400 italic">
          Select a candidate to manage fees and payments.
        </div>
      )}
    </div>
  );
};

const DocumentsScreen = ({ candidateId, onBack, showConfirm, showToast }: { candidateId: number, onBack: () => void, showConfirm: (t: string, m: string, c: () => void) => void, showToast: (m: string) => void }) => {
  const [type, setType] = useState<Document['type']>('Aadhaar');
  const candidate = useLiveQuery(() => db.candidates.get(candidateId), [candidateId]);
  const documents = useLiveQuery(() => db.documents.where('candidateId').equals(candidateId).toArray(), [candidateId]) || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await db.documents.add({
          candidateId,
          type,
          name: file.name,
          data: reader.result as string,
          uploadDate: new Date().toISOString()
        });
        showToast('Document uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm(
      'Delete Document',
      'Are you sure you want to delete this document?',
      async () => {
        await db.documents.delete(id);
        showToast('Document deleted');
      }
    );
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900">Upload New Document</h3>
        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none"
              value={type}
              onChange={(e) => setType(e.target.value as Document['type'])}
            >
              <option>Aadhaar</option>
              <option>Photo</option>
              <option>Address Proof</option>
              <option>Other</option>
            </select>
          </div>
          <div className="relative">
            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <Plus size={20} />
              Select File
            </button>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-900">Stored Documents</h3>
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">{doc.name}</div>
                <div className="text-xs text-slate-400">{doc.type} • {format(parseISO(doc.uploadDate), 'MMM d, yyyy')}</div>
              </div>
              <button onClick={() => handleDelete(doc.id!)} className="p-2 text-rose-500">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic">No documents uploaded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Components ---

const Modal = ({ isOpen, onClose, title, children, footer }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, footer?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="p-6 bg-slate-50 flex gap-3">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn(
        "fixed bottom-24 left-6 right-6 p-4 rounded-2xl shadow-xl z-[110] flex items-center gap-3",
        type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
      )}
    >
      <CheckCircle2 size={20} />
      <span className="text-sm font-bold">{message}</span>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentScreen, setCurrentScreen] = useState({ id: 'dashboard', params: {} as any });
  const [history, setHistory] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [modal, setModal] = useState<{ title: string, content: React.ReactNode, footer: React.ReactNode } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({
      title,
      content: <p className="text-slate-600">{message}</p>,
      footer: (
        <>
          <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200">Cancel</button>
          <button 
            onClick={() => {
              onConfirm();
              setModal(null);
            }} 
            className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600"
          >
            Confirm
          </button>
        </>
      )
    });
  };

  const navigate = (screenId: string, params: any = {}) => {
    setHistory([...history, currentScreen]);
    setCurrentScreen({ id: screenId, params });
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentScreen(prev);
    } else {
      setCurrentScreen({ id: activeTab, params: {} });
    }
  };

  useEffect(() => {
    setCurrentScreen({ id: activeTab, params: {} });
    setHistory([]);
  }, [activeTab]);

  const renderScreen = () => {
    switch (currentScreen.id) {
      case 'dashboard': return <Dashboard onNavigate={navigate} showToast={showToast} />;
      case 'candidates': return <CandidateList onNavigate={navigate} showToast={showToast} />;
      case 'attendance': return <AttendanceScreen candidateId={currentScreen.params.candidateId} showToast={showToast} />;
      case 'fees': return <FeesScreen candidateId={currentScreen.params.candidateId} showToast={showToast} />;
      case 'add-candidate': return <AddCandidate onBack={goBack} editId={currentScreen.params.editId} showToast={showToast} />;
      case 'profile': return <CandidateProfile id={currentScreen.params.id} onNavigate={navigate} onBack={goBack} showConfirm={showConfirm} showToast={showToast} />;
      case 'documents': return <DocumentsScreen candidateId={currentScreen.params.candidateId} onBack={goBack} showConfirm={showConfirm} showToast={showToast} />;
      default: return <Dashboard onNavigate={navigate} showToast={showToast} />;
    }
  };

  const getTitle = () => {
    switch (currentScreen.id) {
      case 'dashboard': return 'RTO Training Center';
      case 'candidates': return 'Candidates';
      case 'attendance': return 'Attendance';
      case 'fees': return 'Fee Collection';
      case 'add-candidate': return currentScreen.params.editId ? 'Edit Candidate' : 'New Candidate';
      case 'profile': return 'Candidate Profile';
      case 'documents': return 'Documents';
      default: return 'RTO Manager';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto shadow-2xl relative overflow-x-hidden">
      <Header 
        title={getTitle()} 
        showBack={history.length > 0 || !['dashboard', 'candidates', 'attendance', 'fees'].includes(currentScreen.id)} 
        onBack={goBack} 
      />
      
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <AnimatePresence>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        {modal && (
          <Modal 
            isOpen={!!modal} 
            onClose={() => setModal(null)} 
            title={modal.title} 
            footer={modal.footer}
          >
            {modal.content}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
