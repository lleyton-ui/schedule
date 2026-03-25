import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc,
  query,
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
  Search,
  Users,
  Loader2,
  AlertCircle,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';

// === CONFIGURATION ===
const firebaseConfig = {
  apiKey: "AIzaSyAnO68l7UBc8uuMQ0ZTygDJ8h1kMcsRIT0",
  authDomain: "schedule-8feb6.firebaseapp.com",
  projectId: "schedule-8feb6",
  storageBucket: "schedule-8feb6.firebasestorage.app",
  messagingSenderId: "85118501498",
  appId: "1:85118501498:web:8e3f1fa68535963736f1c3",
};

// Singleton initialization to prevent multiple instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

const APP_PATH_ID = 'altar-server-app';
const MASS_TIMES = ["5:00 AM", "6:30 AM", "8:00 AM", "9:30 AM", "4:00 PM", "5:30 PM", "7:00 PM"];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  // Authentication Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Authentication failed. Please check connection.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setError(null);
    });
    return () => unsubscribe();
  }, []);

  // Data Subscription
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSchedule(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Unable to sync with live database.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule', id));
    } catch (err) {
      alert("Error deleting record");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredSchedule = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return schedule.filter(item => 
      (item.name?.toLowerCase() || "").includes(term) || 
      (item.role?.toLowerCase() || "").includes(term)
    );
  }, [schedule, searchTerm]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-100 max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Sync Error</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading && !schedule.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Connecting to Registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* Top Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Secretary Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Online • Live Feed</p>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name or role..."
              className="w-full md:w-80 pl-11 pr-5 py-3.5 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Servers</p>
            </div>
            <p className="text-4xl font-black tracking-tighter">{schedule.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-5 h-5" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Slots</p>
            </div>
            <p className="text-4xl font-black tracking-tighter">
              {new Set(schedule.map(s => s.time)).size}<span className="text-lg text-slate-300 ml-1">/ 7</span>
            </p>
          </div>
        </div>

        {/* Mass Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {MASS_TIMES.map(time => {
            const servers = filteredSchedule.filter(s => s.time === time);
            return (
              <div key={time} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-wider">{time}</h3>
                  </div>
                  <span className="bg-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full">
                    {servers.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {servers.length > 0 ? (
                    <div className="space-y-3">
                      {servers.map(item => (
                        <div key={item.id} className="group relative bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-black text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors uppercase">
                                {item.name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {item.role}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting === item.id}
                              className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                            >
                              {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                      <Users className="w-12 h-12 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Empty Slot</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">San Lorenzo Ruiz Parish Admin Console</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}} />
    </div>
  );
}
