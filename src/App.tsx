import { useState, useEffect, useCallback } from 'react';
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
import { createContext, useContext } from 'react';
import { fetchCandidatesFromServer, addCandidateToServer, getDashboardData, markAttendanceOnServer, uploadDocumentToServer, deleteCandidateFromServer, addPaymentToServer, getCandidateDetailsFromServer, getPaymentsByCandidateId } from './services/api';

const CandidatesContext = createContext<{
  candidates: Candidate[];
  isLoading: boolean;
  fetchCandidates: () => Promise<void>;
}>({
  candidates: [],
  isLoading: false,
  fetchCandidates: async () => { },
});

export const useCandidates = () => useContext(CandidatesContext);

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
  <header className="sticky top-0 bg-white/70 backdrop-blur-lg z-40 px-6 py-4 flex items-center gap-4 border-b border-slate-100/50">
    {showBack && (
      <button onClick={onBack} className="p-2 -ml-2 text-slate-600 active:bg-slate-100 rounded-full transition-colors">
        <ArrowLeft size={22} />
      </button>
    )}
    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">{title}</h1>
  </header>
);


// --- Screens ---

const Dashboard = ({ onNavigate, showToast }: { onNavigate: (screen: string, params?: any) => void, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const { candidates, isLoading: isSyncing, fetchCandidates } = useCandidates();

  const [serverStats, setServerStats] = useState<{ totalCandidates: number; completed: number; active: number; pendingFee: number } | null>(null);

  const handleSync = async () => {
    try {
      await fetchCandidates();
      const s = await getDashboardData();
      setServerStats(s);
      showToast('Live dashboard & candidates synced', 'success');
    } catch {
      showToast('Failed to sync from server', 'error');
    }
  };

  const stats = serverStats ? {
    total: serverStats.totalCandidates,
    active: serverStats.active,
    completed: serverStats.completed,
    pendingFee: serverStats.pendingFee,
  } : {
    total: candidates.length,
    active: candidates.filter(c => c.status === 'active').length,
    completed: candidates.filter(c => c.status === 'completed').length,
    pendingFee: candidates.reduce((acc, c) => acc + (c.totalFee - c.collectedFee), 0),
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
        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-4 rounded-3xl border border-blue-100/50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center mb-3">
              <Users className="text-blue-600" size={20} />
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.total}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Candidates</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-blue-600/5 group-hover:scale-110 transition-transform duration-500">
            <Users size={64} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 p-4 rounded-3xl border border-emerald-100/50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="text-emerald-600" size={20} />
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.completed}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Completed</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-emerald-600/5 group-hover:scale-110 transition-transform duration-500">
            <CheckCircle2 size={64} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 p-4 rounded-3xl border border-orange-100/50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center mb-3">
              <Clock className="text-orange-600" size={20} />
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.active}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-orange-600/5 group-hover:scale-110 transition-transform duration-500">
            <Clock size={64} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50/50 to-pink-50/50 p-4 rounded-3xl border border-rose-100/50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-600/10 flex items-center justify-center mb-3">
              <IndianRupee className="text-rose-600" size={18} />
            </div>
            <div className="text-xl font-black text-slate-900 leading-none">{formatCurrency(stats.pendingFee)}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Pending</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-rose-600/5 group-hover:scale-110 transition-transform duration-500">
            <IndianRupee size={64} />
          </div>
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
  const { candidates: allCandidates, isLoading: isSyncing, fetchCandidates } = useCandidates();

  const candidates = allCandidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search)
  );

  const handleSync = async () => {
    try {
      await fetchCandidates();
      showToast('Fetched live candidates from server', 'success');
    } catch {
      showToast('Failed to fetch from server', 'error');
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
            <motion.div
              layout
              key={candidate.id}
              onClick={() => onNavigate('profile', { id: candidate.id })}
              className="group bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all hover:border-blue-200"
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 overflow-hidden ring-2 ring-slate-100 group-hover:ring-blue-100 transition-all">
                {candidate.photo ? <img src={candidate.photo} alt="" className="w-full h-full object-cover" /> : <Users size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">{candidate.name}</div>
                <div className="text-xs text-slate-500 font-medium">{candidate.mobile}</div>
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                candidate.status === 'active'
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                {candidate.status}
              </div>
              <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
            </motion.div>
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

const AddCandidate = ({ onBack, editId, showToast }: { onBack: () => void, editId?: string, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const [formData, setFormData] = useState<Partial<Candidate>>({
    name: '',
    mobile: '',
    address: '',
    aadhaar: '',
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    courseType: 'LMV',
    totalFee: 5000,
    collectedFee: 0,
    status: 'active'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Cannot edit directly if candidates are read-only from live API,
    // Just closing the screen if navigated here accidentally
    if (editId) {
      showToast('Editing is handled on the spreadsheet server side now.');
      onBack();
    }
  }, [editId, onBack, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editId) {
        await db.candidates.update(editId, formData);
        showToast('Candidate updated successfully');
      } else {
        // Save locally first
        await db.candidates.add(formData as Candidate);
        showToast('Candidate saved locally');

        // Then sync to server in background
        try {
          const result = await addCandidateToServer(formData as Candidate);
          if (result.success) {
            showToast('Candidate synced to server ✓');
          } else {
            showToast(`Server: ${result.message}`);
          }
        } catch (serverError) {
          console.error('Server sync failed:', serverError);
          showToast('Saved locally, server sync failed');
        }
      }
      onBack();
    } finally {
      setIsSaving(false);
    }
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
              <option value="LMV">LMV (Light Motor Vehicle)</option>
              <option value="MCWG">MCWG (Motorcycle with Gear)</option>
              <option value="MCWOG">MCWOG (Motorcycle without Gear)</option>
              <option value="HMV">HMV (Heavy Motor Vehicle)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            "w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg transition-transform flex items-center justify-center gap-2",
            isSaving ? "opacity-70 pointer-events-none" : "active:scale-[0.98]"
          )}
        >
          {isSaving ? (
            <>
              <Clock size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            editId ? 'Update Candidate' : 'Save Candidate'
          )}
        </button>
      </form>
    </div>
  );
};

const CandidateProfile = ({ id, onNavigate, onBack, showConfirm, showToast, fetchCandidates }: { id: string, onNavigate: (screen: string, params?: any) => void, onBack: () => void, showConfirm: (t: string, m: string, c: () => void) => void, showToast: (m: string, t?: 'success' | 'error') => void, fetchCandidates: () => Promise<void> }) => {
  const { candidates } = useCandidates();
  const candidate = candidates.find(c => c.id === id);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const documents = useLiveQuery(() => db.documents.where('candidateId').equals(id).toArray(), [id]) || [];

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await getPaymentsByCandidateId(id);
        if (res) {
          const payments = Array.isArray(res) ? res : (res.data || res.payments || []);
          setPaymentHistory(payments);
        }
      } catch (e) {
        console.error('Failed to fetch profile details:', e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [id]);

  if (!candidate) return null;

  const attendanceCount = candidate.serverAttendance || 0;
  const progress = Math.min((attendanceCount / 25) * 100, 100);
  const remainingFee = candidate.totalFee - candidate.collectedFee;

  const handleDelete = () => {
    showConfirm(
      'Delete Candidate',
      'Are you sure you want to delete this candidate from the server?',
      async () => {
        try {
          const res = await deleteCandidateFromServer(id);
          if (res.success) {
            showToast('Candidate deleted successfully', 'success');
            await fetchCandidates();
            onBack();
          } else {
            showToast(`Error: ${res.message}`, 'error');
          }
        } catch (e) {
          showToast('Failed to delete candidate', 'error');
        }
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
          <button
            onClick={async () => {
              if (candidate && candidate.id) {
                try {
                  const res = await markAttendanceOnServer(candidate.id);
                  if (res.success) {
                    showToast('Attendance marked! ✓');
                    await fetchCandidates();
                  } else {
                    showToast(`Error: ${res.message}`, 'error');
                  }
                } catch (e) {
                  showToast('Server error marking attendance', 'error');
                }
              }
            }}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors"
          >
            Mark Today's Attendance
          </button>
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

        {/* Payment History View */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Payment History</h3>
          <div className="space-y-3">
            {loadingHistory ? (
              <div className="text-center py-4 text-slate-400 text-sm">Loading payments...</div>
            ) : paymentHistory.length > 0 ? (
              paymentHistory.map((p, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">{formatCurrency(p.amount || p.paidAmount || 0)}</div>
                    <div className="text-xs text-slate-400">{p.date ? format(parseISO(p.date), 'MMM d, yyyy') : 'Unknown Date'}</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Paid</div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs italic">No server payment history found.</div>
            )}
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

const AttendanceScreen = ({ candidateId, showToast, fetchCandidates }: { candidateId?: string, showToast: (m: string, t?: 'success' | 'error') => void, fetchCandidates: () => Promise<void> }) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidateId || null);
  const { candidates: allCandidates } = useCandidates();
  const candidates = allCandidates.filter(c => c.status === 'active');
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
  const attendanceCount = selectedCandidate?.serverAttendance || 0;

  const handleMarkAttendance = async () => {
    if (!selectedCandidateId) return;
    try {
      const res = await markAttendanceOnServer(selectedCandidateId);
      if (res.success) {
        showToast('Attendance marked! ✓');
        await fetchCandidates();
      } else {
        showToast(`Error: ${res.message}`, 'error');
      }
    } catch (e) {
      showToast('Server error marking attendance', 'error');
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
          onChange={(e) => setSelectedCandidateId(e.target.value)}
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
                {attendanceCount} / 25 Days
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
              ))}
              {days.map(day => {
                const isToday = isSameDay(day, today);
                // Simulated checked days just for visual feedback based on count
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all bg-slate-50 text-slate-400",
                      isToday && "ring-2 ring-blue-500 ring-offset-2"
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

const FeesScreen = ({ candidateId, showToast, fetchCandidates }: { candidateId?: string, showToast: (m: string, t?: 'success' | 'error') => void, fetchCandidates: () => Promise<void> }) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidateId || null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { candidates } = useCandidates();
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCandidateId) {
      getPaymentsByCandidateId(selectedCandidateId).then(res => {
        if (res) {
          const payments = Array.isArray(res) ? res : (res.data || res.payments || []);
          setPaymentHistory(payments);
        }
      }).catch(console.error);
    }
  }, [selectedCandidateId]);

  const handleAddPayment = async () => {
    if (!selectedCandidateId || !selectedCandidate || !amount) return;
    setIsProcessing(true);
    try {
      const res = await addPaymentToServer(selectedCandidateId, selectedCandidate.totalFee, Number(amount));
      if (res.success) {
        showToast('Payment recorded on server! ✓', 'success');
        setAmount('');
        await fetchCandidates();
        // Refresh history
        const resPayment = await getPaymentsByCandidateId(selectedCandidateId);
        if (resPayment) {
          const payments = Array.isArray(resPayment) ? resPayment : (resPayment.data || resPayment.payments || []);
          setPaymentHistory(payments);
        }
      } else {
        showToast(`Error: ${res.message}`, 'error');
      }
    } catch (e) {
      showToast('Server error processing payment', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Candidate</label>
        <select
          className="w-full bg-slate-100 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
          value={selectedCandidateId || ''}
          onChange={(e) => setSelectedCandidateId(e.target.value)}
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
                disabled={isProcessing}
                className={cn(
                  "bg-blue-600 text-white px-6 rounded-2xl font-bold active:scale-95 transition-transform",
                  isProcessing && "opacity-50 pointer-events-none"
                )}
              >
                {isProcessing ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Payment History</h3>
            <div className="space-y-3">
              {paymentHistory.map((payment, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">{formatCurrency(payment.amount || payment.paidAmount || 0)}</div>
                    <div className="text-xs text-slate-400">{payment.date ? format(parseISO(payment.date), 'MMM d, yyyy') : 'Online Payment'}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
              ))}
              {paymentHistory.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-sm">No payment history found on server.</div>
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

const DocumentsScreen = ({ candidateId, onBack, showConfirm, showToast, fetchCandidates }: { candidateId: string, onBack: () => void, showConfirm: (t: string, m: string, c: () => void) => void, showToast: (m: string, t?: 'success' | 'error') => void, fetchCandidates: () => Promise<void> }) => {
  const [type, setType] = useState<Document['type']>('Aadhaar');
  const { candidates } = useCandidates();
  const candidate = candidates.find(c => c.id === candidateId);
  const documents = useLiveQuery(() => db.documents.where('candidateId').equals(candidateId).toArray(), [candidateId]) || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const res = await uploadDocumentToServer(candidateId, file.name, file.type, base64Data);
          if (res.success) {
            showToast('Document uploaded to server! ✓', 'success');
            // Save locally for cache/offline view
            await db.documents.add({
              candidateId,
              type,
              name: file.name,
              data: reader.result as string,
              uploadDate: new Date().toISOString()
            });
            await fetchCandidates();
          } else {
            showToast(`Error: ${res.message}`, 'error');
          }
        } catch (serverError) {
          showToast('Failed to upload to server', 'error');
        }
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

  const [globalCandidates, setGlobalCandidates] = useState<Candidate[]>([]);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(true);

  const fetchCandidates = useCallback(async () => {
    setIsFetchingCandidates(true);
    try {
      const data = await fetchCandidatesFromServer();
      setGlobalCandidates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingCandidates(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

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
      case 'attendance': return <AttendanceScreen candidateId={currentScreen.params.candidateId} showToast={showToast} fetchCandidates={fetchCandidates} />;
      case 'fees': return <FeesScreen candidateId={currentScreen.params.candidateId} showToast={showToast} fetchCandidates={fetchCandidates} />;
      case 'add-candidate': return <AddCandidate onBack={goBack} editId={currentScreen.params.editId} showToast={showToast} />;
      case 'profile': return <CandidateProfile id={currentScreen.params.id} onNavigate={navigate} onBack={goBack} showConfirm={showConfirm} showToast={showToast} fetchCandidates={fetchCandidates} />;
      case 'documents': return <DocumentsScreen candidateId={currentScreen.params.candidateId} onBack={goBack} showConfirm={showConfirm} showToast={showToast} fetchCandidates={fetchCandidates} />;
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
    <CandidatesContext.Provider value={{ candidates: globalCandidates, isLoading: isFetchingCandidates, fetchCandidates }}>
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
              {isFetchingCandidates && currentScreen.id !== 'dashboard' && globalCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 opacity-50">
                  <Clock className="animate-spin mb-4" size={32} />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Loading Live Data...</p>
                </div>
              ) : (
                renderScreen()
              )}
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
    </CandidatesContext.Provider>
  );
}

