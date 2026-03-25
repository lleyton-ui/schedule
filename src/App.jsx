import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc,
  query,
  addDoc,
  serverTimestamp,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  Clock, 
  Trash2, 
  Calendar, 
  User, 
  Search,
  RefreshCw,
  AlertCircle,
  WifiOff,
  DatabaseZap,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  RefreshCcw
} from 'lucide-react';

// === CONFIGURATION ===
const firebaseConfig = {
  apiKey: "AIzaSyAnO68l7UBc8uuMQ0ZTygDJ8h1kMcsRIT0",
  authDomain: "schedule-8feb6.firebaseapp.com",
  projectId: "schedule-8feb6",
  storageBucket: "schedule-8feb6.firebasestorage.app",
  messagingSenderId: "85118501498",
  appId: "1:85118501498:web:8e3f1fa68535963736f1c3",
  measurementId: "G-N44W6136MD"
};

// Initialize Services (Corrected Order)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable Persistence for Instant Loading
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open.");
    }
  });
} catch (e) {}

const APP_PATH_ID = 'altar-server-app';

const MASS_TIMES = [
  "5:00 AM", "6:30 AM", "8:00 AM", "9:30 AM",
  "4:00 PM", "5:30 PM", "7:00 PM"
];

const ROLES = [
  "Thurifer", "Boat", "Cross", "Candle 1", "Candle 2", "Server"
];

const App = () => {
  const [view, setView] = useState('form'); // 'form' or 'dashboard'
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [forceShow, setForceShow] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    time: MASS_TIMES[0],
    role: ROLES[0]
  });

  const connectToFirebase = useCallback(async () => {
    setIsInitializing(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Auth error:", err);
      setError("Connection Error: Please check internet settings.");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsInitializing(false);
      } else {
        connectToFirebase();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeAuth();
    };
  }, [connectToFirebase]);

  useEffect(() => {
    if (!user) return;

    const scheduleRef = collection(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule');
    const q = query(scheduleRef);

    const unsubscribeData = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedule(data);
      setIsDataLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setIsDataLoading(false);
    });

    const timer = setTimeout(() => {
      if (isDataLoading && schedule.length === 0) setConnectionTimeout(true);
    }, 4000);

    return () => {
      unsubscribeData();
      clearTimeout(timer);
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    const savedData = { ...formData, name: formData.name.trim() };
    setFormData({ ...formData, name: '' });

    try {
      const scheduleRef = collection(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule');
      await addDoc(scheduleRef, {
        ...savedData,
        userId: user?.uid,
        createdAt: serverTimestamp()
      });
      setSuccessMessage('Registration confirmed!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError('Sync failed, but we will retry automatically.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule', id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSchedule = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return schedule.filter(item => 
      (item.name?.toLowerCase() || "").includes(term) ||
      (item.role?.toLowerCase() || "").includes(term)
    );
  }, [schedule, searchTerm]);

  const groupedSchedule = useMemo(() => {
    const groups = {};
    MASS_TIMES.forEach(time => {
      groups[time] = filteredSchedule.filter(item => item.time === time);
    });
    return groups;
  }, [filteredSchedule]);

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-blue-600 p-8 text-white text-center relative">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-blue-200" />
              <h1 className="text-xl font-black uppercase tracking-tight">Altar Server</h1>
              <p className="text-blue-100 text-xs opacity-80">Sunday Mass Enrollment</p>
              <button 
                onClick={() => setView('dashboard')}
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {successMessage && (
                <div className="p-4 rounded-2xl flex items-center gap-3 border bg-emerald-50 text-emerald-700 border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Server Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter full name"
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mass Time</label>
                    <select 
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-white font-semibold text-sm appearance-none"
                    >
                      {MASS_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-white font-semibold text-sm appearance-none"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading || isInitializing}
                  className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Submit Attendance"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (!schedule.length && isDataLoading && !forceShow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        {!connectionTimeout ? (
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
        ) : (
          <div className="max-w-xs space-y-4">
            <WifiOff className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-lg font-black uppercase">Connection Slow</h2>
            <button onClick={() => setForceShow(true)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest">Enter Anyway</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('form')} className="bg-blue-600 p-2 rounded-lg text-white"><ChevronRight className="w-5 h-5 rotate-180" /></button>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Secretary Panel</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-36 sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-5">
            <User className="text-blue-600 w-6 h-6" />
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Servers</p>
              <h3 className="text-2xl font-black">{schedule.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-5">
            <Calendar className="text-emerald-600 w-6 h-6" />
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Mass Coverage</p>
              <h3 className="text-2xl font-black">{MASS_TIMES.filter(t => groupedSchedule[t].length > 0).length}/7</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {MASS_TIMES.map(time => (
            <div key={time} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <span className="font-black text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> {time}
                </span>
                <span className="text-[10px] font-black px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg">{groupedSchedule[time].length} Joined</span>
              </div>
              <div className="p-2">
                {groupedSchedule[time].length > 0 ? (
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-50">
                      {groupedSchedule[time].map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 w-1/4">{item.role}</td>
                          <td className="px-4 py-4 font-black text-slate-700 text-xs uppercase">{item.name}</td>
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div className="py-10 text-center text-slate-300 text-[9px] font-black uppercase">No servers yet</div>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
