import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Baby, Cloud, LogIn, LogOut } from "lucide-react";

// =============================
// LITTLE KICKS TRACKER
// Login Google + Cloud Sync Ready
// =============================
//
// Cara aktivasi cloud sync:
// 1. Buat project Firebase
// 2. Aktifkan Authentication > Google
// 3. Aktifkan Firestore Database
// 4. Isi firebaseConfig di bawah
//
// Kalau firebaseConfig belum diisi, app tetap jalan dengan localStorage.

const STORAGE_KEY = "little-kicks-tracker-local-v1";

const firebaseConfig = {
  apiKey: "AIzaSyDcNgHY5TTlAC9ctkT6jjwGR8Yne25nJnA",
  authDomain: "little-kicks-tracker-e6eb1.firebaseapp.com",
  projectId: "little-kicks-tracker-e6eb1",
  storageBucket: "little-kicks-tracker-e6eb1.appspot.com",
  messagingSenderId: "84421098243",
  appId: "1:84421098243:web:494e4d7303b273ff3b0736",
};

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

function todayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMinutes(ms) {
  if (ms == null) return "-";
  const totalMinutes = Math.round(ms / 60000);
  return `${totalMinutes} menit`;
}

function getAverageTimeToTen(kicks) {
  if (!kicks || kicks.length < 10) return null;
  const sorted = [...kicks].sort((a, b) => a - b);
  const durations = [];

  for (let i = 0; i <= sorted.length - 10; i++) {
    durations.push(sorted[i + 9] - sorted[i]);
  }

  return durations.reduce((sum, val) => sum + val, 0) / durations.length;
}

function getMostActiveWindow(kicks) {
  if (!kicks || kicks.length === 0) return "-";

  const buckets = new Array(24).fill(0);

  kicks.forEach((ts) => {
    buckets[new Date(ts).getHours()] += 1;
  });

  const maxCount = Math.max(...buckets);
  const hour = buckets.findIndex((count) => count === maxCount);
  if (hour < 0) return "-";

  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String((hour + 1) % 24).padStart(2, "0")}:00`;
  return `${start} – ${end}`;
}

function getCategory(total) {
  if (total === 0) return "Belum tercatat";
  if (total <= 10) return "Ringan";
  if (total <= 30) return "Sedang";
  return "Aktif";
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kicksByDate: {}, notesByDate: {} };
    return JSON.parse(raw);
  } catch {
    return { kicksByDate: {}, notesByDate: {} };
  }
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseServices, setFirebaseServices] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [date, setDate] = useState(todayKey());
  const [localData, setLocalData] = useState({ kicksByDate: {}, notesByDate: {} });
  const [cloudData, setCloudData] = useState({ kicksByDate: {}, notesByDate: {} });
  const [note, setNote] = useState("");

  useEffect(() => {
    setLocalData(loadLocalData());
  }, []);

  useEffect(() => {
    async function setupFirebase() {
      if (!hasFirebaseConfig()) {
        setFirebaseReady(false);
        setAuthLoading(false);
        return;
      }

      try {
        const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
          import("firebase/app"),
          import("firebase/auth"),
          import("firebase/firestore"),
        ]);

        const app = initializeApp(firebaseConfig);
        const auth = authModule.getAuth(app);
        const db = firestoreModule.getFirestore(app);
        const googleProvider = new authModule.GoogleAuthProvider();

        setFirebaseServices({
          auth,
          db,
          googleProvider,
          authModule,
          firestoreModule,
        });
        setFirebaseReady(true);

        const unsubscribe = authModule.onAuthStateChanged(auth, async (user) => {
          setAuthUser(user || null);
          setAuthLoading(false);

          if (!user) {
            setCloudData({ kicksByDate: {}, notesByDate: {} });
            return;
          }

          const ref = firestoreModule.doc(db, "users", user.uid, "tracker", "little-kicks");
          const snap = await firestoreModule.getDoc(ref);

          if (snap.exists()) {
            setCloudData(snap.data());
          } else {
            const initial = { kicksByDate: {}, notesByDate: {} };
            await firestoreModule.setDoc(ref, initial);
            setCloudData(initial);
          }
        });

        return () => unsubscribe?.();
      } catch (error) {
        console.error("Firebase setup failed:", error);
        setFirebaseReady(false);
        setAuthLoading(false);
      }
    }

    setupFirebase();
  }, []);

  const activeData = useMemo(() => {
    return authUser ? cloudData : localData;
  }, [authUser, cloudData, localData]);

  useEffect(() => {
    setNote(activeData.notesByDate?.[date] || "");
  }, [date, activeData]);

  const kicksToday = activeData.kicksByDate?.[date] || [];
  const totalToday = kicksToday.length;
  const avgTimeToTen = getAverageTimeToTen(kicksToday);
  const mostActiveWindow = getMostActiveWindow(kicksToday);
  const sortedDates = Object.keys(activeData.kicksByDate || {}).sort((a, b) => (a < b ? 1 : -1));

  function updateLocal(updater) {
    setLocalData((prev) => {
      const next = updater(prev);
      saveLocalData(next);
      return next;
    });
  }

  async function updateCloud(updater) {
    if (!authUser || !firebaseServices) return;

    const next = updater(cloudData);
    setCloudData(next);

    const { firestoreModule, db } = firebaseServices;
    const ref = firestoreModule.doc(db, "users", authUser.uid, "tracker", "little-kicks");
    await firestoreModule.setDoc(ref, next, { merge: true });
  }

  function addKick() {
    const now = Date.now();

    if (authUser) {
      updateCloud((prev) => ({
        ...prev,
        kicksByDate: {
          ...prev.kicksByDate,
          [date]: [...(prev.kicksByDate?.[date] || []), now].sort((a, b) => a - b),
        },
      }));
      return;
    }

    updateLocal((prev) => ({
      ...prev,
      kicksByDate: {
        ...prev.kicksByDate,
        [date]: [...(prev.kicksByDate?.[date] || []), now].sort((a, b) => a - b),
      },
    }));
  }

  function saveNote() {
    if (authUser) {
      updateCloud((prev) => ({
        ...prev,
        notesByDate: {
          ...prev.notesByDate,
          [date]: note,
        },
      }));
      return;
    }

    updateLocal((prev) => ({
      ...prev,
      notesByDate: {
        ...prev.notesByDate,
        [date]: note,
      },
    }));
  }

  async function signInWithGoogle() {
    if (!firebaseReady || !firebaseServices) return;
    const { auth, googleProvider, authModule } = firebaseServices;
    await authModule.signInWithPopup(auth, googleProvider);
  }

  async function signOutFromGoogle() {
    if (!firebaseServices) return;
    await firebaseServices.authModule.signOut(firebaseServices.auth);
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 text-stone-800">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="rounded-3xl border-stone-200 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-800">
                  By Haryo & Vika
                </div>
                <CardTitle className="text-4xl font-bold text-stone-800">
                  Little Kicks Tracker
                </CardTitle>
                <CardDescription className="mt-3 text-base leading-8 text-stone-600">
                  Ketika bayi bergerak, klik tombol "Bayi Bergerak". Aplikasi ini akan merangkum
                  rata-rata waktu yang dibutuhkan untuk mencapai 10 gerakan, total gerakan harian,
                  menunjukkan jendela waktu dimana bayi paling aktif, history antar tanggal, dan
                  catatan keluhan sehingga dapat digunakan untuk konsultasi dengan tenaga kesehatan.
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2">
                {authLoading ? (
                  <Badge variant="secondary" className="rounded-xl px-3 py-2">
                    Memuat...
                  </Badge>
                ) : authUser ? (
                  <>
                    <Badge className="rounded-xl bg-emerald-800 px-3 py-2 text-white">
                      <Cloud className="mr-2 h-4 w-4" />
                      Cloud Sync Aktif
                    </Badge>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={signOutFromGoogle}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar
                    </Button>
                  </>
                ) : firebaseReady ? (
                  <Button
                    className="rounded-2xl bg-emerald-800 text-white hover:bg-emerald-900"
                    onClick={signInWithGoogle}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Masuk dengan Google
                  </Button>
                ) : (
                  <Badge variant="secondary" className="rounded-xl px-3 py-2">
                    Mode lokal
                  </Badge>
                )}
              </div>
            </div>

            {!firebaseReady ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Cloud sync belum aktif
                </div>
                Isi firebaseConfig terlebih dulu agar login Google dan sinkronisasi HP/laptop bisa
                dipakai. Selama belum aktif, data tetap tersimpan di browser perangkat ini.
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-2xl border-stone-300"
            />

            <MetricCard label="Tanggal" value={formatDate(date)} />
            <MetricCard label="Total gerakan" value={String(totalToday)} emphasis />
            <MetricCard
              label="Rata-rata waktu mencapai 10 gerakan"
              value={formatMinutes(avgTimeToTen)}
              emphasis
            />
            <MetricCard label="Jendela waktu paling aktif" value={mostActiveWindow} emphasis />
            <MetricCard label="Kategori" value={getCategory(totalToday)} emphasis />

            <Button
              onClick={addKick}
              className="h-14 w-full rounded-2xl bg-emerald-800 text-lg text-white hover:bg-emerald-900"
            >
              <Baby className="mr-2 h-5 w-5" />
              Bayi Bergerak
            </Button>

            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <div>
                <div className="text-sm text-stone-500">Catatan keluhan harian</div>
                <div className="mt-1 text-sm text-stone-600">
                  Tulis keluhan, perubahan pola gerakan, atau hal yang ingin disampaikan saat
                  konsultasi.
                </div>
              </div>

              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: hari ini gerakan terasa lebih aktif setelah makan malam, perut bawah terasa lebih kencang, kaki agak bengkak, atau catatan lain untuk tenaga kesehatan."
                className="min-h-[140px] rounded-2xl border-stone-300"
              />

              <Button onClick={saveNote} variant="outline" className="rounded-2xl border-stone-300">
                Simpan Catatan Harian
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">History harian</CardTitle>
            <CardDescription>Lihat total gerakan dan ringkasan tiap tanggal.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {sortedDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
                Belum ada history tersimpan.
              </div>
            ) : (
              sortedDates.slice(0, 14).map((day) => {
                const kicks = activeData.kicksByDate?.[day] || [];
                const dayNote = activeData.notesByDate?.[day] || "";

                return (
                  <div key={day} className="rounded-2xl border border-stone-200 p-4">
                    <div className="mb-1 text-sm text-stone-500">{formatDateShort(day)}</div>
                    <div className="font-semibold">{kicks.length} gerakan</div>
                    <div className="text-sm text-stone-600">
                      Rata-rata 10 gerakan: {formatMinutes(getAverageTimeToTen(kicks))}
                    </div>
                    <div className="text-sm text-stone-600">
                      Jendela aktif: {getMostActiveWindow(kicks)}
                    </div>

                    {dayNote ? (
                      <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm leading-6 text-stone-700 ring-1 ring-stone-200">
                        <span className="font-medium">Keluhan harian:</span> {dayNote}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, emphasis = false }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="text-sm text-stone-500">{label}</div>
      <div
        className={
          emphasis
            ? "mt-1 text-2xl font-bold text-stone-800"
            : "mt-1 text-lg font-semibold text-stone-800"
        }
      >
        {value}
      </div>
    </div>
  );
}
