import React, { useState, useEffect, useMemo } from 'react';
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
  User, 
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  WifiOff,
  DatabaseZap
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAnO68l7UBc8uuMQ0ZTygDJ8h1kMcsRIT0",
  authDomain: "schedule-8feb6.firebaseapp.com",
  projectId: "schedule-8feb6",
  storageBucket: "schedule-8feb6.firebasestorage.app",
  messagingSenderId: "85118501498",
  appId: "1:85118501498:web:8e3f1fa68535963736f1c3",
  measurementId: "G-N44W6136MD"
};

// Initialize Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// SPEED FIX: Enable Local Persistence (Caching)
// This makes the dashboard load instantly using local data while it syncs in the background.
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented-parameter') {
      console.warn("The current browser does not support persistence.");
    }
  });
} catch (e) {
  // Silent fail if already initialized
}

const APP_PATH_ID = 'altar-server-app';

const MASS_TIMES = [
  "5:00 AM", "6:30 AM", "8:00 AM", "9:30 AM",
  "4:00 PM", "5:30 PM", "7:00 PM"
];

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor online status for UI feedback
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Authentication Logic - Streamlined
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else initAuth();
    });

    // Reduce timeout to 6 seconds for better user experience
    const timer = setTimeout(() => {
      if (loading && schedule.length === 0) setConnectionTimeout(true);
    }, 6000);

    return () => {
      unsubscribeAuth();
      clearTimeout(timer);
    };
  }, [loading, schedule.length]);

  // 2. Real-time Data Sync - Optimized for speed
  useEffect(() => {
    const scheduleRef = collection(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule');
    const q = query(scheduleRef);

    // Snapshot options { includeMetadataChanges: true } helps with offline feedback
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If we have any data (even from cache), stop the loading spinner
      setSchedule(data);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Firestore Error:", err);
      if (err.code === 'permission-denied') {
        setError("Access Denied: Check Firestore Rules.");
      }
      // Don't set loading false here if we have cached data
      if (schedule.length === 0) setLoading(false);
    });

    return () => unsubscribeData();
  }, [user, schedule.length]);

  const handleDelete = async (id) => {
    // Delete is "optimistic" in Firestore - it will disappear from UI instantly
    try {
      await deleteDoc(doc(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule', id));
    } catch (err) {
      alert("Failed to delete. Check your connection.");
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

  if (loading && schedule.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        {!connectionTimeout ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
              <DatabaseZap className="w-4 h-4 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Turbo Sync Active</p>
              <p className="text-slate-400 text-xs">Loading local cache...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-xs space-y-4">
            <WifiOff className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Slow Connection</h2>
            <p className="text-slate-500 text-sm">Waiting for server response...</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              Force Refresh
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {isOffline && (
        <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center">
          Working Offline - Changes will sync when reconnected
        </div>
      )}
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="text-white w-5 h-5" /></div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800">Secretary Panel</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Real-time Dashboard</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Instant search..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 w-40 sm:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Access Issue</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-blue-50 rounded-xl">
              <User className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Live Count</p>
              <h3 className="text-2xl font-black">{schedule.length}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Calendar className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Covered Slots</p>
              <h3 className="text-2xl font-black">{MASS_TIMES.filter(t => groupedSchedule[t].length > 0).length}/7</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {MASS_TIMES.map(time => (
            <div key={time} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center group-hover:bg-slate-100 transition-colors">
                <span className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-blue-600" /> {time}
                </span>
                <span className="text-[10px] font-black px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full uppercase tracking-tighter shadow-sm">
                  {groupedSchedule[time].length} Servers
                </span>
              </div>
              <div className="p-2">
                {groupedSchedule[time].length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-slate-100">
                        {groupedSchedule[time].map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-4 w-1/3">
                              <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-900 text-white rounded tracking-widest">
                                {item.role}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-700 text-sm">{item.name}</td>
                            <td className="px-4 py-4 text-right">
                              <button 
                                onClick={() => handleDelete(item.id)} 
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Open Slots Available</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <footer className="mt-12 text-center space-y-2 pb-8 opacity-50">
        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.3em]">
          Firestore Cache Enabled • {user ? 'Sync Online' : 'Connecting...'}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;