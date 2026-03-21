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
  Clock,
  Car as CarIcon,
  Fuel,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { db } from './db';
import { Candidate, Document, Attendance, Payment, Car, PetrolRecord } from './types';
import { cn, formatCurrency } from './utils';
import { createContext, useContext } from 'react';
import { fetchCandidatesFromServer, addCandidateToServer, getDashboardData, uploadDocumentToServer, deleteCandidateFromServer, getCandidateDetailsFromServer, markAttendanceOnServer, addPaymentToServer, getPaymentsByCandidateId, updateCandidateToServer, addPetrolRecordToServer, fetchPetrolRecordsFromServer, getAttendanceByCandidateId, deleteAttendanceFromServer } from './services/api';

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
    { id: 'car-management', icon: CarIcon, label: 'Car' },
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

  const totalCollected = candidates.reduce((acc, c) => acc + (c.collectedFee || 0), 0);
  const totalPending = candidates.reduce((acc, c) => acc + ((c.totalFee || 0) - (c.collectedFee || 0)), 0);

  const stats = serverStats ? {
    total: serverStats.totalCandidates,
    active: serverStats.active,
    completed: serverStats.completed,
    collected: totalCollected, // Prefer local reduction for accuracy
    pending: totalPending
  } : {
    total: candidates.length,
    active: candidates.filter(c => c.status === 'active').length,
    completed: candidates.filter(c => c.status === 'completed').length,
    collected: totalCollected,
    pending: totalPending
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-lg font-bold opacity-80">Welcome Back</h2>
          <p className="text-2xl font-bold mt-1">Sankalp Training School</p>
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
        {/* Fuel Consumption Card */}
        {(() => {
          const petrolRecords = useLiveQuery(() => db.petrolRecords.toArray()) || [];
          const now = new Date();
          const currentMonthRecords = petrolRecords.filter(r => {
            const d = parseISO(r.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          const totalMonthlyAmount = currentMonthRecords.reduce((acc, r) => acc + r.amount, 0);
          const totalMonthlyLiters = currentMonthRecords.reduce((acc, r) => acc + r.liters, 0);

          return (
            <div 
              onClick={() => onNavigate('car-management')}
              className="bg-emerald-600 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden group col-span-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Fuel Consumption ({format(now, 'MMMM')})</div>
                  <div className="text-3xl font-black">{formatCurrency(totalMonthlyAmount)}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Fuel size={24} />
                </div>
              </div>
              <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Total Liters</div>
                  <div className="text-xl font-bold">{totalMonthlyLiters.toFixed(1)} L</div>
                </div>
                <div className="text-[10px] font-black uppercase text-emerald-200 bg-white/5 px-2 py-1 rounded-lg">Vehicle Fleet</div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-125 transition-transform duration-700">
                <Fuel size={120} />
              </div>
            </div>
          );
        })()}
        {/* Row 1: Finances */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden group col-span-2">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Fee Collected</div>
              <div className="text-3xl font-black text-emerald-400">{formatCurrency(stats.collected)}</div>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <IndianRupee size={24} />
            </div>
          </div>
          <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex justify-between items-end">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Amount</div>
              <div className="text-xl font-bold text-rose-400">{formatCurrency(stats.pending)}</div>
            </div>
            <div className="text-[10px] font-black uppercase text-slate-500 bg-white/5 px-2 py-1 rounded-lg">Live Summary</div>
          </div>
          <div className="absolute -right-4 -bottom-4 text-white/5 opacity-50 group-hover:scale-125 transition-transform duration-700">
            <IndianRupee size={120} />
          </div>
        </div>

        {/* Row 2: Status Cards */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Users className="text-blue-600" size={20} />
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.total}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-blue-600/5 group-hover:scale-110 transition-transform duration-500">
            <Users size={64} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
              <Clock className="text-orange-500" size={20} />
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.active}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-orange-600/5 group-hover:scale-110 transition-transform duration-500">
            <Clock size={64} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg relative overflow-hidden group col-span-2">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-none">{stats.completed}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Students Completed</div>
              </div>
            </div>
            <div className="text-emerald-500">
              <ChevronRight size={20} />
            </div>
          </div>
          <div className="absolute right-10 -bottom-4 text-emerald-600/5 opacity-50">
            <CheckCircle2 size={80} />
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

const CandidateList = ({ onNavigate, showToast, setActiveTab }: { onNavigate: (screen: string, params?: any) => void, showToast: (m: string, t?: 'success' | 'error') => void, setActiveTab: (tab: string) => void }) => {
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

const AddCandidate = ({ onBack, onNavigate, editId, showToast, setActiveTab, fetchCandidates }: { onBack: () => void, onNavigate: (s: string, p?: any) => void, editId?: string, showToast: (m: string, t?: 'success' | 'error') => void, setActiveTab: (tab: string) => void, fetchCandidates: () => Promise<void> }) => {
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

  const { candidates } = useCandidates();

  useEffect(() => {
    if (editId) {
      const candidateToEdit = candidates.find(c => c.id === editId);
      if (candidateToEdit) {
        setFormData({
          ...candidateToEdit,
          joiningDate: candidateToEdit.joiningDate ? format(parseISO(candidateToEdit.joiningDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
        });
      }
    }
  }, [editId, candidates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editId) {
        // Optimistic local update
        await db.candidates.update(editId, formData as Candidate);
        showToast('Updating candidate...', 'success');
        
        onBack();

        try {
          const res = await updateCandidateToServer(editId, formData as Candidate);
          if (res.success) {
            showToast('Candidate updated successfully ✓', 'success');
            await fetchCandidates();
          } else {
            showToast(`Update failed: ${res.message}`, 'error');
            await fetchCandidates();
          }
        } catch (err) {
          console.error('Server update failed:', err);
          showToast('Updated locally, sync failed', 'error');
          await fetchCandidates();
        }
      } else {
        // Save locally first for instant UX
        const tempId = `temp-${Date.now()}`;
        const newCandidate = { ...formData, id: tempId } as Candidate;
        await db.candidates.add(newCandidate);
        showToast('Processing...', 'success');

        // Redirect to listing screen immediately for better UX
        setActiveTab('candidates');
        onNavigate('candidates');

        // Then sync to server in background
        try {
          const result = await addCandidateToServer(newCandidate);
          if (result.success) {
            showToast('Candidate added successfully ✓', 'success');
            // Refresh from server to get the real ID and updated list
            await fetchCandidates();
          } else {
            showToast(`Server: ${result.message}`, 'error');
            await fetchCandidates();
          }
        } catch (serverError) {
          console.error('Server sync failed:', serverError);
          showToast('Added locally, server sync failed', 'error');
          await fetchCandidates();
        }
      }
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

const AttendanceCalendar = ({ candidateId, showToast, fetchCandidates }: { candidateId: string, showToast: (m: string, t?: 'success' | 'error') => void, fetchCandidates: () => Promise<void> }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAttendanceByCandidateId(candidateId);
      setAttendance(data);
    } catch (e) {
      showToast('Failed to fetch attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, showToast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const handleDateClick = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = attendance.find(a => format(parseISO(a.date), 'yyyy-MM-dd') === dateStr);
    
    if (existing) {
        // Delete
        try {
            const res = await deleteAttendanceFromServer(existing.id);
            if (res.success) {
                showToast('Attendance removed', 'success');
                await fetchAttendance();
                await fetchCandidates();
            } else {
                showToast(res.message || 'Failed to remove attendance', 'error');
            }
        } catch (e) {
            showToast('Failed to remove attendance', 'error');
        }
    } else {
        // Mark
        try {
            const res = await markAttendanceOnServer(candidateId, dateStr);
            if (res.success) {
                showToast('Attendance marked', 'success');
                await fetchAttendance();
                await fetchCandidates();
            } else {
                showToast(res.message || 'Failed to mark attendance', 'error');
            }
        } catch (e) {
            showToast('Failed to mark attendance', 'error');
        }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-extrabold text-slate-900 text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100 shadow-sm"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100 shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const attRecord = attendance.find(a => format(parseISO(a.date), 'yyyy-MM-dd') === dateStr);
              const hasAttended = !!attRecord;
              const isToday = isSameDay(day, new Date());
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
                    hasAttended ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600 border border-slate-50",
                    isToday && !hasAttended && "ring-2 ring-blue-100"
                  )}
                >
                  <span className={cn("text-xs font-black", hasAttended ? "text-white" : "text-slate-900")}>
                    {format(day, 'd')}
                  </span>
                  {hasAttended && (
                    <div className="w-1 h-1 rounded-full absolute bottom-1.5 bg-white" />
                  )}
                </button>
              );
            })}
          </div>
          {isLoading && <div className="text-center mt-4 text-xs text-slate-400 animate-pulse">Syncing attendance...</div>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Present This Month</div>
            <div className="text-3xl font-black">{attendance.filter(r => {
              const d = parseISO(r.date);
              return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
            }).length}</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform">
            <CalendarCheck size={64} />
          </div>
        </div>
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Present</div>
            <div className="text-3xl font-black text-emerald-400">{attendance.length}</div>
          </div>
          <div className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={64} />
          </div>
        </div>
      </div>
    </div>
  );
}

const CandidateProfile = ({ id, onNavigate, onBack, showConfirm, showToast, fetchCandidates }: { id: string, onNavigate: (screen: string, params?: any) => void, onBack: () => void, showConfirm: (t: string, m: string, c: () => void) => void, showToast: (m: string, t?: 'success' | 'error') => void, fetchCandidates: () => Promise<void> }) => {
  const { candidates } = useCandidates();
  const candidate = candidates.find(c => c.id === id);
  const documents = useLiveQuery(() => db.documents.where('candidateId').equals(id).toArray(), [id]) || [];
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance'>('overview');

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

  const handleMarkAttendance = async () => {
    setIsMarking(true);
    try {
      const res = await markAttendanceOnServer(id);
      if (res.success) {
        showToast(res.message || 'Attendance marked!', 'success');
        await fetchCandidates();
      } else {
        showToast(res.message, 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to mark attendance', 'error');
    } finally {
      setIsMarking(false);
    }
  };

  const handleAddPayment = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return;
    
    if (numAmount > remainingFee) {
      showToast(`Amount exceeds remaining balance (${formatCurrency(remainingFee)})`, 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await addPaymentToServer(id, candidate.totalFee, numAmount);
      if (res.success) {
        showToast('Payment recorded successfully', 'success');
        setAmount('');
        await fetchCandidates();
        // Refresh history
        const paymentsRes = await getPaymentsByCandidateId(id);
        if (paymentsRes) {
          const payments = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes.data || paymentsRes.payments || []);
          setPaymentHistory(payments);
        }
      } else {
        showToast(res.message, 'error');
      }
    } catch (e: any) {
      showToast('Failed to process payment', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

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


  return (
    <div className="pb-24 print:pb-0 font-outfit">
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-slate-200 shadow-inner">
            {candidate.photo ? <img src={candidate.photo} alt="" className="w-full h-full object-cover" /> : <Users size={40} />}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{candidate.name}</h2>
            <p className="text-slate-500 font-bold mt-1.5 opacity-70 tracking-tight">{candidate.mobile}</p>
            <div className="mt-4 flex gap-2 print:hidden">
              <button
                onClick={() => onNavigate('add-candidate', { editId: id })}
                className="text-[10px] font-black tracking-tighter text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl uppercase transition-all duration-300"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-[10px] font-black tracking-tighter text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl uppercase transition-all duration-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200/50">
          <button
            onClick={() => setProfileTab('overview')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300",
              profileTab === 'overview' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setProfileTab('attendance')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300",
              profileTab === 'attendance' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Attendance
          </button>
        </div>

        {profileTab === 'overview' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Dashboard Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden group col-span-2">
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Remaining Balance</div>
                  <div className="text-4xl font-black text-emerald-400 tracking-tighter">{formatCurrency(remainingFee)}</div>
                  <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/5">
                    <div className="flex-1">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Fee</div>
                      <div className="text-base font-black opacity-80">{formatCurrency(candidate.totalFee)}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-black text-slate-500 uppercase text-right tracking-widest">Collected</div>
                      <div className="text-base font-black text-emerald-500 text-right">{formatCurrency(candidate.collectedFee)}</div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 text-white/5 group-hover:scale-110 transition-transform duration-700">
                  <IndianRupee size={150} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-lg relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-4 shadow-sm">
                    <CalendarCheck className="text-orange-500" size={20} />
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{attendanceCount}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 opacity-60">Days Present</div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-orange-500/5 group-hover:scale-110 transition-transform">
                  <CalendarCheck size={64} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-lg relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 shadow-sm">
                    <FileText className="text-blue-500" size={20} />
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{documents.length}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 opacity-60">Documents</div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-blue-500/5 group-hover:scale-110 transition-transform">
                  <FileText size={64} />
                </div>
              </div>
            </div>


            {/* Payment Input */}
            <div className="space-y-4">
              <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] ml-2 opacity-50">Collect Fee</h3>
              <div className="flex gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg group-focus-within:text-blue-600 transition-colors">₹</div>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-white border-2 border-slate-100 rounded-3xl py-5 pl-12 pr-6 font-black text-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleAddPayment}
                  disabled={isProcessing || !amount}
                  className="px-8 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl disabled:opacity-30 disabled:pointer-events-none hover:bg-black"
                >
                  Post
                </button>
              </div>
            </div>

            {/* Payment History */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] opacity-50">Payment History</h3>
                {paymentHistory.length > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{paymentHistory.length} TXNS</span>}
              </div>
              <div className="space-y-4">
                {paymentHistory.map((payment, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-md hover:border-blue-100 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                        <IndianRupee size={22} />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-lg tracking-tight leading-none">{formatCurrency(payment.amount || payment.paidAmount || 0)}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">{payment.date ? format(parseISO(payment.date), 'MMM d, yyyy') : 'Live Sync'}</div>
                      </div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-emerald-50/50 text-emerald-600 text-[9px] font-black uppercase tracking-tighter border border-emerald-100">Paid ✓</div>
                  </div>
                ))}
                {paymentHistory.length === 0 && !loadingHistory && (
                  <div className="text-center py-12 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60 italic">No payments found.</p>
                  </div>
                )}
                {loadingHistory && (
                  <div className="text-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loading History...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4 pb-12">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] opacity-50">Documents</h3>
                <button
                  onClick={() => onNavigate('documents', { candidateId: id })}
                  className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  + Add New
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-lg flex items-center gap-4 group hover:border-blue-100 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                      <FileText size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate tracking-tight uppercase">{doc.type}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{format(parseISO(doc.uploadDate), 'MMM d, yyyy')}</div>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="col-span-2 text-center py-10 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60 italic">No files uploaded.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <AttendanceCalendar 
              candidateId={id} 
              showToast={showToast} 
              fetchCandidates={fetchCandidates} 
            />
          </div>
        )}
      </div>
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

const CarManagement = ({ onNavigate, showToast, fetchPetrolRecords, isSyncing }: { onNavigate: (s: string, p?: any) => void, showToast: (m: string, t?: 'success' | 'error') => void, fetchPetrolRecords: () => Promise<void>, isSyncing: boolean }) => {
  const cars = useLiveQuery(() => db.cars.toArray()) || [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCar, setNewCar] = useState({ name: '', number: '' });

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCar.name || !newCar.number) return;
    try {
      await db.cars.add({
        id: `car-${Date.now()}`,
        name: newCar.name,
        number: newCar.number.toUpperCase()
      });
      showToast('Car added successfully', 'success');
      setNewCar({ name: '', number: '' });
      setShowAddForm(false);
    } catch (err) {
      showToast('Failed to add car', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Car Fleet</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchPetrolRecords}
            disabled={isSyncing}
            className={cn(
               "p-2 rounded-xl transition-all",
               isSyncing ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 active:scale-95 shadow-sm"
            )}
          >
            <Clock size={20} className={isSyncing ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => onNavigate('petrol-calendar')}
            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {Array.from(new Map(cars.map(car => [car.number, car])).values()).map(car => (
          <motion.div
            layout
            key={car.id}
            onClick={() => onNavigate('petrol-entry', { carId: car.id, carName: car.name, carNumber: car.number })}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all hover:border-blue-200 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:bg-blue-600 transition-colors">
              <CarIcon size={28} />
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-900 text-lg leading-tight">{car.name}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{car.number}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
              <Plus size={20} />
            </div>
          </motion.div>
        ))}

        {cars.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <CarIcon size={32} />
            </div>
            <p className="text-slate-400 font-medium italic">No cars added yet.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-blue-600 font-bold text-sm uppercase tracking-widest"
            >
              Add First Car
            </button>
          </div>
        ) : (
          <div className="pt-4">
            <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3">
              <Fuel className="text-blue-600" size={20} />
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Tap on a car to record petrol entry</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-sm rounded-t-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Add New Car</h3>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
              </div>
              <form onSubmit={handleAddCar} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Car Name</label>
                  <input
                    required
                    autoFocus
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Maruti Swift"
                    value={newCar.name}
                    onChange={(e) => setNewCar({ ...newCar, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Car Number</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. MH 12 AB 1234"
                    value={newCar.number}
                    onChange={(e) => setNewCar({ ...newCar, number: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-transform"
                >
                  SAVE CAR
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};

const PetrolEntry = ({ carId, carName, carNumber, onBack, showToast }: { carId: string, carName: string, carNumber: string, onBack: () => void, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    liters: '',
    amount: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const record: PetrolRecord = {
      id: `ptr-${Date.now()}`,
      carId,
      carName,
      carNumber,
      date: formData.date,
      liters: Number(formData.liters),
      amount: Number(formData.amount)
    };

    try {
      // Save locally first
      await db.petrolRecords.add(record);
      showToast('Record saved locally', 'success');

      // Sync to server
      const res = await addPetrolRecordToServer(record);
      if (res.success) {
        showToast('Record synced to server ✓', 'success');
      } else {
        showToast(`Server sync failed: ${res.message}`, 'error');
      }
      onBack();
    } catch (err) {
      showToast('Failed to save record', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
            <Fuel size={24} className="text-blue-400" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">{carName}</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{carNumber}</p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <CarIcon size={140} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Refuel Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="date"
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Liters</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.01"
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-4 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  placeholder="0.00"
                  value={formData.liters}
                  onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">L</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                <input
                  required
                  type="number"
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-8 pr-4 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            "w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3",
            isSaving ? "opacity-70 pointer-events-none" : "active:scale-[0.98] hover:bg-blue-700"
          )}
        >
          {isSaving ? (
            <>
              <Clock size={20} className="animate-spin" />
              RECORDING ENTRY...
            </>
          ) : (
            <>
              <Fuel size={20} />
              SUBMIT RECORD
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const PetrolCalendarView = ({ onBack, showToast, fetchPetrolRecords, isSyncing }: { onBack: () => void, showToast: (m: string, t?: 'success' | 'error') => void, fetchPetrolRecords: () => Promise<void>, isSyncing: boolean }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const records = useLiveQuery(() => db.petrolRecords.toArray()) || [];
  const [month, setMonth] = useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });

  const recordsForMonth = records.filter(r => {
    const d = parseISO(r.date);
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
  });

  const totalMonthlyAmount = recordsForMonth.reduce((acc, r) => acc + r.amount, 0);
  const totalMonthlyLiters = recordsForMonth.reduce((acc, r) => acc + r.liters, 0);

  const selectedDateRecords = records.filter(r => isSameDay(parseISO(r.date), selectedDate));

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-extrabold text-slate-900 text-lg">{format(month, 'MMMM yyyy')}</h3>
          <div className="flex gap-2">
            <button 
              onClick={fetchPetrolRecords}
              disabled={isSyncing}
              className={cn(
                "p-2 rounded-xl transition-all",
                isSyncing ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 active:scale-95"
              )}
            >
              <Clock size={18} className={isSyncing ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => setMonth(new Date(month.setMonth(month.getMonth() - 1)))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <button 
              onClick={() => setMonth(new Date(month.setMonth(month.getMonth() + 1)))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map(day => {
            const hasRecord = records.some(r => isSameDay(parseISO(r.date), day));
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
                  isSelected ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600",
                  isToday && !isSelected && "ring-2 ring-blue-100"
                )}
              >
                <span className={cn("text-xs font-black", isSelected ? "text-white" : "text-slate-900")}>
                  {format(day, 'd')}
                </span>
                {hasRecord && (
                  <div className={cn(
                    "w-1 h-1 rounded-full absolute bottom-1.5",
                    isSelected ? "bg-white" : "bg-blue-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 p-4 rounded-3xl text-white">
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Monthly Cost</div>
          <div className="text-lg font-black text-emerald-400">{formatCurrency(totalMonthlyAmount)}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100">
          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Vol</div>
          <div className="text-lg font-black text-slate-900">{totalMonthlyLiters.toFixed(1)} <span className="text-[10px] text-slate-400">L</span></div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest ml-1">
          {isSameDay(selectedDate, new Date()) ? 'TODAY' : format(selectedDate, 'MMM d, yyyy')}
        </h4>
        <div className="space-y-3">
          {selectedDateRecords.map(record => (
            <div key={record.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Fuel size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate tracking-tight">{record.carName}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.carNumber}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 leading-none">{formatCurrency(record.amount)}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-1">{record.liters} L</div>
              </div>
            </div>
          ))}
          {selectedDateRecords.length === 0 && (
            <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 font-medium italic">No entries for this date.</p>
            </div>
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

  const localCandidates = useLiveQuery(() => db.candidates.toArray()) || [];
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPetrolSyncing, setIsPetrolSyncing] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await fetchCandidatesFromServer();
      await db.transaction('rw', db.candidates, async () => {
        await db.candidates.clear();
        await db.candidates.bulkAdd(data);
      });
    } catch (err) {
      console.error('Fetch candidates error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const fetchPetrolRecords = useCallback(async () => {
    setIsPetrolSyncing(true);
    try {
      const data = await fetchPetrolRecordsFromServer();
      
      // Extract unique cars from records
      const uniqueCars: Car[] = [];
      const seenCarNumbers = new Set<string>();
      
      data.forEach(record => {
        if (record.carNumber && !seenCarNumbers.has(record.carNumber)) {
          seenCarNumbers.add(record.carNumber);
          uniqueCars.push({
            id: record.carId || `car-${record.carNumber}`,
            name: record.carName,
            number: record.carNumber
          });
        }
      });

      await db.transaction('rw', [db.petrolRecords, db.cars], async () => {
        // Update petrol records
        await db.petrolRecords.clear();
        await db.petrolRecords.bulkAdd(data);
        
        // Update cars list from server records too
        if (uniqueCars.length > 0) {
          // Instead of clear(), we merge with local cars to avoid losing local-only cars
          for (const car of uniqueCars) {
            const exists = await db.cars.where('number').equals(car.number).first();
            if (!exists) {
              await db.cars.add(car);
            }
          }
        }
      });
    } catch (err) {
      console.error('Fetch petrol error:', err);
    } finally {
      setIsPetrolSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchPetrolRecords();
  }, [fetchCandidates, fetchPetrolRecords]);

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
      case 'candidates': return <CandidateList onNavigate={navigate} showToast={showToast} setActiveTab={setActiveTab} />;
      case 'add-candidate': return <AddCandidate onBack={goBack} onNavigate={navigate} editId={currentScreen.params.editId} showToast={showToast} setActiveTab={setActiveTab} fetchCandidates={fetchCandidates} />;
      case 'profile': return <CandidateProfile id={currentScreen.params.id} onNavigate={navigate} onBack={goBack} showConfirm={showConfirm} showToast={showToast} fetchCandidates={fetchCandidates} />;
      case 'documents': return <DocumentsScreen candidateId={currentScreen.params.candidateId} onBack={goBack} showConfirm={showConfirm} showToast={showToast} fetchCandidates={fetchCandidates} />;
      case 'car-management': return <CarManagement onNavigate={navigate} showToast={showToast} fetchPetrolRecords={fetchPetrolRecords} isSyncing={isPetrolSyncing} />;
      case 'petrol-entry': return <PetrolEntry carId={currentScreen.params.carId} carName={currentScreen.params.carName} carNumber={currentScreen.params.carNumber} onBack={goBack} showToast={showToast} />;
      case 'petrol-calendar': return <PetrolCalendarView onBack={goBack} showToast={showToast} fetchPetrolRecords={fetchPetrolRecords} isSyncing={isPetrolSyncing} />;
      default: return <Dashboard onNavigate={navigate} showToast={showToast} />;
    }
  };

  const getTitle = () => {
    switch (currentScreen.id) {
      case 'dashboard': return 'Sankalp Training School';
      case 'candidates': return 'Candidates';
      case 'add-candidate': return currentScreen.params.editId ? 'Edit Candidate' : 'New Candidate';
      case 'profile': return 'Candidate Profile';
      case 'documents': return 'Documents';
      case 'car-management': return 'Car Fleet';
      case 'petrol-entry': return 'Petrol Entry';
      case 'petrol-calendar': return 'Petrol Calendar';
      default: return 'Sankalp Manager';
    }
  };

  return (
    <CandidatesContext.Provider value={{ candidates: localCandidates, isLoading: isSyncing, fetchCandidates }}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto shadow-2xl relative overflow-x-hidden">
        <Header
          title={getTitle()}
          showBack={history.length > 0 || !['dashboard', 'candidates'].includes(currentScreen.id)}
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
              {isSyncing && localCandidates.length === 0 ? (
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

