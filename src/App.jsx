import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
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
  Search,
  Users,
  Loader2
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

// === INITIALIZE SERVICES ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) {}

const APP_PATH_ID = 'altar-server-app';
const MASS_TIMES = ["5:00 AM", "6:30 AM", "8:00 AM", "9:30 AM", "4:00 PM", "5:30 PM", "7:00 PM"];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsInitializing(false);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'artifacts', APP_PATH_ID, 'public', 'data', 'schedule', id));
  };

  const filteredSchedule = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return schedule.filter(item => 
      item.name?.toLowerCase().includes(term) || item.role?.toLowerCase().includes(term)
    );
  }, [schedule, searchTerm]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Secretary Panel</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Attendance Tracking</p>
            </div>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by name or role..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-2xl border-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 flex items-center gap-5 shadow-sm">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Users className="w-7 h-7" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registered</p>
              <p className="text-3xl font-black">{schedule.length}</p>
            </div>
          </div>
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 flex items-center gap-5 shadow-sm">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Calendar className="w-7 h-7" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Mass Slots</p>
              <p className="text-3xl font-black">{MASS_TIMES.filter(t => schedule.some(s => s.time === t)).length}/7</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {MASS_TIMES.map(time => {
            const group = filteredSchedule.filter(s => s.time === time);
            return (
              <div key={time} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-black text-sm uppercase tracking-wider">{time}</span>
                  </div>
                  <span className="text-[10px] font-black bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 shadow-sm">
                    {group.length} SERVERS
                  </span>
                </div>
                <div className="flex-1 p-4">
                  {group.length > 0 ? (
                    <div className="space-y-2">
                      {group.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:border-blue-100 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-1.5 h-8 bg-slate-900 rounded-full group-hover:bg-blue-600 transition-colors"></div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{item.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.role}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">No assignments recorded</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
