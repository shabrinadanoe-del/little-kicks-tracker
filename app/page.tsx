"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Baby,
  CalendarDays,
  ClipboardPlus,
  Clock3,
  FileText,
  HeartPulse,
  Trash2,
} from "lucide-react";

type TrackerData = {
  kicksByDate: Record<string, number[]>;
  notesByDate: Record<string, string>;
};

type TabKey = "monitor" | "history" | "notes";

const STORAGE_KEY = "little-kicks-tracker-v1";
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const defaultData: TrackerData = {
  kicksByDate: {},
  notesByDate: {},
};

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadData(): TrackerData {
  if (typeof window === "undefined") return defaultData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<TrackerData>;

    return {
      kicksByDate: parsed.kicksByDate ?? {},
      notesByDate: parsed.notesByDate ?? {},
    };
  } catch {
    return defaultData;
  }
}

function saveData(data: TrackerData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getHourlyCounts(kicks: number[] = []) {
  const counts = Object.fromEntries(HOURS.map((hour) => [hour, 0])) as Record<number, number>;
  for (const ts of kicks) {
    const hour = new Date(ts).getHours();
    counts[hour] += 1;
  }
  return counts;
}

function getPeakHours(hourlyCounts: Record<number, number>) {
  const entries = Object.entries(hourlyCounts);
  const max = Math.max(0, ...entries.map(([, value]) => Number(value)));
  if (max === 0) return [] as number[];
  return entries
    .filter(([, value]) => Number(value) === max)
    .map(([hour]) => Number(hour));
}

function getActivityLabel(total: number) {
  if (total === 0) return "Belum tercatat";
  if (total <= 10) return "Ringan";
  if (total <= 30) return "Sedang";
  return "Aktif";
}

function getHeatColor(value: number, max: number) {
  if (value === 0 || max === 0) return "bg-stone-100 text-stone-400 border-stone-200";
  const ratio = value / max;
  if (ratio < 0.34) return "bg-[#E5EBDC] text-[#60725C] border-[#C9D4BE]";
  if (ratio < 0.67) return "bg-[#C7D3BA] text-[#4C5A49] border-[#A7B39A]";
  return "bg-[#60725C] text-white border-[#60725C]";
}

function cardBase(extra = "") {
  return `rounded-[28px] border border-[#E9E0D2] bg-cream shadow-soft ${extra}`;
}

export default function HomePage() {
  const [data, setData] = useState<TrackerData>(defaultData);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("monitor");

  useEffect(() => {
    const initial = loadData();
    setData(initial);
    setNote(initial.notesByDate[todayKey()] ?? "");
  }, []);

  useEffect(() => {
    setNote(data.notesByDate[selectedDate] ?? "");
  }, [selectedDate, data.notesByDate]);

  const kicksForDate = data.kicksByDate[selectedDate] ?? [];
  const hourlyForDate = useMemo(() => getHourlyCounts(kicksForDate), [kicksForDate]);
  const peakHours = useMemo(() => getPeakHours(hourlyForDate), [hourlyForDate]);
  const maxHourCount = Math.max(0, ...Object.values(hourlyForDate));

  const summary = useMemo(() => {
    const total = kicksForDate.length;
    return {
      total,
      firstKick: kicksForDate[0],
      lastKick: kicksForDate[kicksForDate.length - 1],
      activityLabel: getActivityLabel(total),
    };
  }, [kicksForDate]);

  const orderedDates = useMemo(
    () => Object.keys(data.kicksByDate).sort((a, b) => (a < b ? 1 : -1)),
    [data.kicksByDate]
  );

  const historyRows = useMemo(
    () =>
      orderedDates.map((date) => {
        const kicks = data.kicksByDate[date] ?? [];
        const hourly = getHourlyCounts(kicks);
        return {
          date,
          kicks,
          hourly,
          peakHours: getPeakHours(hourly),
          total: kicks.length,
          note: data.notesByDate[date] ?? "",
        };
      }),
    [orderedDates, data.kicksByDate, data.notesByDate]
  );

  function updateData(updater: (prev: TrackerData) => TrackerData) {
    setData((prev) => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }

  function addKick() {
    const timestamp = Date.now();
    updateData((prev) => ({
      ...prev,
      kicksByDate: {
        ...prev.kicksByDate,
        [selectedDate]: [...(prev.kicksByDate[selectedDate] ?? []), timestamp].sort((a, b) => a - b),
      },
    }));
  }

  function removeKick(timestamp: number) {
    updateData((prev) => ({
      ...prev,
      kicksByDate: {
        ...prev.kicksByDate,
        [selectedDate]: (prev.kicksByDate[selectedDate] ?? []).filter((item) => item !== timestamp),
      },
    }));
  }

  function saveNoteForDate() {
    updateData((prev) => ({
      ...prev,
      notesByDate: {
        ...prev.notesByDate,
        [selectedDate]: note,
      },
    }));
  }

  function resetSelectedDate() {
    updateData((prev) => ({
      ...prev,
      kicksByDate: {
        ...prev.kicksByDate,
        [selectedDate]: [],
      },
      notesByDate: {
        ...prev.notesByDate,
        [selectedDate]: "",
      },
    }));
    setNote("");
  }

  return (
    <main className="min-h-screen bg-[#F7F2E9] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className={cardBase()}>
            <div className="p-5 md:p-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-3xl bg-sand p-4 text-bark">
                    <Baby className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-moss/80">
                      by Haryo &amp; Vika
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-bark md:text-4xl">
                      Little Kicks Tracker
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/80 md:text-base">
                      Tinggal tekan saat bayi bergerak. Aplikasi akan merangkum total gerakan harian,
                      jam paling aktif, history antar tanggal, dan catatan keluhan untuk kontrol ke obgyn.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#E6DBC9] bg-white/50 px-4 py-3 text-sm text-bark/80">
                  Simple, calming, earth tone
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-2 text-sm font-medium text-bark">
                  Tanggal pencatatan
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-12 rounded-2xl border border-[#E2D7C8] bg-white px-4 text-bark outline-none ring-0 transition focus:border-moss"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addKick}
                    className="h-14 w-full rounded-2xl bg-moss px-6 text-base font-semibold text-white transition hover:brightness-95 md:w-auto"
                  >
                    Bayi Bergerak
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Tanggal" value={formatDate(selectedDate)} compact />
                <SummaryCard label="Total gerakan" value={String(summary.total)} />
                <SummaryCard
                  label="Jam paling aktif"
                  value={peakHours.length ? peakHours.map(formatHour).join(", ") : "-"}
                />
                <SummaryCard label="Kategori" value={summary.activityLabel} />
              </div>
            </div>
          </div>

          <div className={cardBase()}>
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 text-bark">
                <HeartPulse className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-semibold">Catatan penting</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-bark/80">
                <p>Aplikasi ini membantu pencatatan pribadi, bukan alat diagnosis medis.</p>
                <p>
                  Kalau gerakan bayi terasa jauh berkurang dari pola biasanya, atau kamu khawatir,
                  segera hubungi dokter atau fasilitas kesehatan.
                </p>
                <p>
                  Jumlah gerakan bisa berbeda tiap jam dan tiap hari. Yang lebih penting adalah pola
                  biasanya dan perubahan yang terasa bermakna.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={cardBase()}>
          <div className="border-b border-[#E8DDCE] px-4 pt-4 md:px-6">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "monitor"}
                onClick={() => setActiveTab("monitor")}
                icon={<ClipboardPlus className="h-4 w-4" />}
                label="Monitor"
              />
              <TabButton
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                icon={<CalendarDays className="h-4 w-4" />}
                label="History"
              />
              <TabButton
                active={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
                icon={<FileText className="h-4 w-4" />}
                label="Catatan Keluhan"
              />
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === "monitor" && (
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className={cardBase("bg-white")}>
                  <div className="p-5 md:p-6">
                    <h3 className="text-xl font-semibold text-bark">Grafik pola gerakan hari ini</h3>
                    <p className="mt-2 text-sm text-bark/70">
                      Semakin tinggi batangnya, semakin sering gerakan tercatat pada jam itu.
                    </p>

                    {summary.total === 0 ? (
                      <EmptyState text="Belum ada gerakan yang tercatat untuk tanggal ini." />
                    ) : (
                      <>
                        <div className="mt-6 grid h-[270px] grid-cols-12 items-end gap-2 md:grid-cols-24">
                          {HOURS.map((hour) => {
                            const count = hourlyForDate[hour];
                            const height = maxHourCount > 0 ? Math.max(14, (count / maxHourCount) * 220) : 14;
                            return (
                              <div key={hour} className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-bark/55">{count}</span>
                                <div
                                  className={`w-full rounded-t-xl ${count > 0 ? "bg-moss" : "bg-[#E8DFD2]"}`}
                                  style={{ height }}
                                  title={`${formatHour(hour)} • ${count} gerakan`}
                                />
                                <span className="text-[10px] text-bark/55">{String(hour).padStart(2, "0")}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                          <MiniInfo label="Gerakan pertama" value={summary.firstKick ? formatTime(summary.firstKick) : "-"} />
                          <MiniInfo label="Gerakan terakhir" value={summary.lastKick ? formatTime(summary.lastKick) : "-"} />
                          <MiniInfo
                            label="Jam paling aktif"
                            value={peakHours.length ? peakHours.map(formatHour).join(", ") : "-"}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className={cardBase("bg-white")}>
                  <div className="p-5 md:p-6">
                    <h3 className="text-xl font-semibold text-bark">Riwayat klik hari ini</h3>
                    <p className="mt-2 text-sm text-bark/70">
                      Kamu bisa hapus satu klik kalau tadi kepencet tidak sengaja.
                    </p>

                    <div className="mt-5 space-y-3">
                      {kicksForDate.length === 0 ? (
                        <EmptyState text="Belum ada riwayat gerakan pada tanggal ini." />
                      ) : (
                        kicksForDate
                          .slice()
                          .sort((a, b) => b - a)
                          .map((timestamp, index) => (
                            <div
                              key={`${timestamp}-${index}`}
                              className="flex items-center justify-between rounded-2xl border border-[#E8DDCE] bg-[#FFFDFC] px-4 py-3"
                            >
                              <div>
                                <div className="font-medium text-bark">Gerakan tercatat</div>
                                <div className="text-sm text-bark/65">{formatTime(timestamp)}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeKick(timestamp)}
                                className="rounded-xl border border-[#E6DAC7] p-2 text-bark/70 transition hover:bg-[#F4EEE4]"
                                aria-label="Hapus satu gerakan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                {historyRows.length === 0 ? (
                  <EmptyState text="Belum ada data history." />
                ) : (
                  historyRows.map((row) => {
                    const maxHourly = Math.max(0, ...Object.values(row.hourly));
                    return (
                      <div key={row.date} className="rounded-[26px] border border-[#E8DDCE] bg-white p-4 md:p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-bark">{formatDate(row.date)}</h3>
                            <p className="mt-1 text-sm text-bark/70">
                              Total {row.total} gerakan • Jam paling aktif:{" "}
                              {row.peakHours.length ? row.peakHours.map(formatHour).join(", ") : "-"}
                            </p>
                          </div>
                          <div className="inline-flex w-fit rounded-full bg-[#F4EEE4] px-3 py-1 text-sm font-medium text-bark">
                            {getActivityLabel(row.total)}
                          </div>
                        </div>

                        <div className="mt-4 overflow-x-auto">
                          <div className="min-w-[980px] space-y-2">
                            <div className="grid grid-cols-[150px_repeat(24,minmax(0,1fr))] gap-2 text-xs text-bark/60">
                              <div>Jam</div>
                              {HOURS.map((hour) => (
                                <div key={hour} className="text-center">
                                  {String(hour).padStart(2, "0")}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-[150px_repeat(24,minmax(0,1fr))] gap-2">
                              <div className="flex items-center text-sm font-medium text-bark">Jumlah gerakan</div>
                              {HOURS.map((hour) => (
                                <div
                                  key={hour}
                                  className={`flex h-12 items-center justify-center rounded-xl border text-sm font-medium ${getHeatColor(
                                    row.hourly[hour],
                                    maxHourly
                                  )}`}
                                  title={`${formatHour(hour)} • ${row.hourly[hour]} gerakan`}
                                >
                                  {row.hourly[hour]}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {row.note ? (
                          <div className="mt-4 rounded-2xl bg-[#F7F2E9] px-4 py-3 text-sm text-bark/80">
                            <span className="font-semibold text-bark">Keluhan / catatan:</span> {row.note}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div className={cardBase("bg-white")}>
                  <div className="p-5 md:p-6">
                    <h3 className="text-xl font-semibold text-bark">Ringkasan tanggal terpilih</h3>
                    <div className="mt-5 space-y-3 rounded-3xl bg-[#F7F2E9] p-4 text-sm text-bark/80">
                      <p>
                        <span className="font-semibold text-bark">Tanggal:</span> {formatDate(selectedDate)}
                      </p>
                      <p>
                        <span className="font-semibold text-bark">Total gerakan:</span> {summary.total}
                      </p>
                      <p>
                        <span className="font-semibold text-bark">Jam paling aktif:</span>{" "}
                        {peakHours.length ? peakHours.map(formatHour).join(", ") : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardBase("bg-white")}>
                  <div className="p-5 md:p-6">
                    <h3 className="text-xl font-semibold text-bark">Catatan keluhan</h3>
                    <p className="mt-2 text-sm text-bark/70">
                      Tulis keluhan, perubahan pola gerakan, atau hal yang ingin disampaikan saat kontrol.
                    </p>

                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Contoh: Bayi lebih aktif setelah makan malam. Hari ini gerakan terasa lebih halus. Ibu merasa perut bawah lebih nyeri dan kaki agak bengkak."
                      className="mt-5 min-h-[220px] w-full rounded-3xl border border-[#E2D7C8] bg-[#FFFDFC] px-4 py-4 text-bark outline-none focus:border-moss"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveNoteForDate}
                        className="rounded-2xl bg-moss px-5 py-3 font-semibold text-white transition hover:brightness-95"
                      >
                        Simpan catatan
                      </button>
                      <button
                        type="button"
                        onClick={resetSelectedDate}
                        className="rounded-2xl border border-[#E2D7C8] bg-white px-5 py-3 font-semibold text-bark transition hover:bg-[#F4EEE4]"
                      >
                        Reset data tanggal ini
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7DCCD] bg-white px-4 py-4 shadow-sm">
      <div className="text-sm text-bark/65">{label}</div>
      <div className={compact ? "mt-2 text-sm font-medium text-bark" : "mt-2 text-xl font-semibold text-bark"}>
        {value}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
        active ? "bg-moss text-white" : "bg-[#F4EEE4] text-bark hover:bg-[#ECE1D0]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E8DDCE] bg-[#FFFDFC] px-4 py-4">
      <div className="text-sm text-bark/65">{label}</div>
      <div className="mt-2 text-lg font-semibold text-bark">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-[#DCCFBC] bg-[#FFFDFC] px-4 py-8 text-center text-sm text-bark/65">
      {text}
    </div>
  );
}
