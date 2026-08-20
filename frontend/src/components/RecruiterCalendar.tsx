import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Trash2,
  Edit3,
  CalendarCheck,
  StickyNote,
  ListTodo,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "todo" | "interview" | "note" | "deadline";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  type: EventType;
  time?: string; // HH:MM
  applicantName?: string;
  meetingLink?: string;
  completed?: boolean;
  createdAt: string;
}

interface RecruiterCalendarProps {
  /** Optional: link events to specific applicants */
  selectedApplicantName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_META: Record<EventType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  todo: { label: "To-Do", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", icon: ListTodo },
  interview: { label: "Interview", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: CalendarCheck },
  note: { label: "Note", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: StickyNote },
  deadline: { label: "Deadline", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", icon: AlertCircle },
};

const STORAGE_KEY = "recruiter-calendar-events";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

const isToday = (year: number, month: number, day: number) => {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
};

const isPast = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const loadEvents = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveEvents = (events: CalendarEvent[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
};

const getSafeMeetingLink = (value: string) => {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const RecruiterCalendar = ({ selectedApplicantName }: RecruiterCalendarProps) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<EventType>("todo");
  const [formTime, setFormTime] = useState("");
  const [formApplicant, setFormApplicant] = useState("");
  const [formMeetingLink, setFormMeetingLink] = useState("");

  // Load events from localStorage
  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  // Persist events
  const persistEvents = useCallback((updated: CalendarEvent[]) => {
    setEvents(updated);
    saveEvents(updated);
  }, []);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Array<{ day: number; dateKey: string; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        dateKey: formatDateKey(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        dateKey: formatDateKey(currentYear, currentMonth, d),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        day: d,
        dateKey: formatDateKey(nextYear, nextMonth, d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
      });
  }, [events, selectedDate]);

  // Upcoming events (next 7 days)
  const todayStr = useMemo(() => formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()), [today]);
  const nextWeekStr = useMemo(() => {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDateKey(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate());
  }, [today]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.date >= todayStr && e.date <= nextWeekStr && !e.completed)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      })
      .slice(0, 5);
  }, [events, todayStr, nextWeekStr]);

  // Event counts per date
  const eventCounts = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((e) => {
      counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    });
    return counts;
  }, [events]);

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Form handlers
  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormType("todo");
    setFormTime("");
    setFormApplicant("");
    setFormMeetingLink("");
    setEditingEvent(null);
    setShowAddForm(false);
  };

  const openAddForm = (date: string) => {
    setSelectedDate(date);
    resetForm();
    setFormApplicant(selectedApplicantName || "");
    setShowAddForm(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || "");
    setFormType(event.type);
    setFormTime(event.time || "");
    setFormApplicant(event.applicantName || "");
    setFormMeetingLink(event.meetingLink || "");
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const meetingLink = getSafeMeetingLink(formMeetingLink);
    if (formMeetingLink.trim() && !meetingLink) {
      toast.error("Enter a valid http or https meeting link");
      return;
    }
    if (!selectedDate) {
      toast.error("Select a date first");
      return;
    }

    if (editingEvent) {
      const updated = events.map((e) =>
        e.id === editingEvent.id
          ? {
              ...e,
              title: formTitle.trim(),
              description: formDescription.trim() || undefined,
              type: formType,
              time: formTime || undefined,
              applicantName: formApplicant.trim() || undefined,
              meetingLink,
            }
          : e
      );
      persistEvents(updated);
      toast.success("Event updated");
    } else {
      const newEvent: CalendarEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: selectedDate,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        type: formType,
        time: formTime || undefined,
        applicantName: formApplicant.trim() || undefined,
        meetingLink,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      persistEvents([...events, newEvent]);
      toast.success("Event added");
    }
    resetForm();
  };

  const toggleComplete = (eventId: string) => {
    const updated = events.map((e) =>
      e.id === eventId ? { ...e, completed: !e.completed } : e
    );
    persistEvents(updated);
  };

  const deleteEvent = (eventId: string) => {
    persistEvents(events.filter((e) => e.id !== eventId));
    toast.success("Event deleted");
    if (editingEvent?.id === eventId) resetForm();
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={`rounded-2xl border border-violet-200 bg-white text-base text-black shadow-sm overflow-hidden ${isExpanded ? "col-span-full" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-violet-600" />
          <h3 className="text-lg font-bold text-black">Recruiter Calendar</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-10 gap-1.5 bg-violet-600 px-3 text-base hover:bg-violet-700"
            onClick={() =>
              openAddForm(
                selectedDate ||
                  formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
              )
            }
          >
            <Plus className="h-4 w-4" />
            Add event
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-2 text-base"
            onClick={goToToday}
            title="Go to today"
          >
            <span className="font-bold text-violet-600">Today</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-base font-bold text-black">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map(({ day, dateKey, isCurrentMonth }) => {
            const count = eventCounts.get(dateKey) ?? 0;
            const isSelected = selectedDate === dateKey;
            const isTodayDate = isCurrentMonth && isToday(currentYear, currentMonth, day);
            const hasEvents = count > 0;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-xs transition-all ${
                  isSelected
                    ? "bg-violet-600 text-white shadow-md"
                    : isTodayDate
                    ? "bg-violet-100 text-violet-800 font-bold"
                    : isCurrentMonth
                    ? "text-slate-700 hover:bg-slate-50"
                    : "text-slate-300"
                }`}
              >
                <span className={`text-[11px] font-semibold ${isSelected ? "text-white" : ""}`}>
                  {day}
                </span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 w-1 rounded-full ${
                          isSelected ? "bg-white/80" : "bg-violet-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="border-t border-slate-100 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-bold text-black">
              {formatDateDisplay(selectedDate)}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 gap-1.5 text-base text-violet-600 hover:text-violet-700"
              onClick={() => openAddForm(selectedDate)}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p className="py-2 text-center text-base text-black">No events</p>
          ) : (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {selectedDateEvents.map((event) => {
                const meta = EVENT_TYPE_META[event.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={event.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-base transition ${
                      event.completed
                        ? "opacity-50 border-slate-100 bg-slate-50"
                        : `${meta.border} ${meta.bg}`
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleComplete(event.id)}
                      className="mt-0.5 shrink-0"
                    >
                      {event.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-black ${event.completed ? "line-through opacity-50" : ""}`}>
                        {event.title}
                      </p>
                      {event.time && (
                        <p className="mt-1 flex items-center gap-1.5 text-base text-black">
                          <Clock className="h-3.5 w-3.5" /> {event.time}
                        </p>
                      )}
                      {event.applicantName && (
                        <p className="mt-1 text-base text-black">
                          👤 {event.applicantName}
                        </p>
                      )}
                      {getSafeMeetingLink(event.meetingLink || "") && (
                        <a
                          href={getSafeMeetingLink(event.meetingLink || "")}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-900"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open meeting
                        </a>
                      )}
                      {event.description && (
                        <p className="mt-1 line-clamp-2 text-base text-black">{event.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => openEditForm(event)}
                        className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEvent(event.id)}
                        className="rounded p-0.5 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && !showAddForm && (
        <div className="border-t border-slate-100 px-3 py-3">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-black">Upcoming</p>
          <div className="space-y-1">
            {upcomingEvents.map((event) => {
              const meta = EVENT_TYPE_META[event.type];
              const Icon = meta.icon;
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 rounded-lg border ${meta.border} ${meta.bg} p-3 text-base`}
                >
                  <Icon className={`h-3 w-3 shrink-0 ${meta.color}`} />
                  <span className="flex-1 truncate font-semibold text-black">{event.title}</span>
                  <span className="shrink-0 text-black">{formatDateDisplay(event.date)}</span>
                  {event.time && <span className="shrink-0 text-black">{event.time}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-black">
              {editingEvent ? "Edit Event" : "New Event"}
            </p>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Event type selector */}
          <div className="flex gap-1">
            {(["todo", "interview", "note", "deadline"] as const).map((type) => {
              const meta = EVENT_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormType(type)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
                    formType === type
                      ? `${meta.border} ${meta.bg} ${meta.color}`
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>

          <Input
            placeholder="Event title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="h-11 border-violet-300 bg-violet-50/40 text-base text-black placeholder:text-slate-500 focus-visible:border-violet-600 focus-visible:ring-violet-500"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-base font-bold text-black">Time</label>
              <Input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="mt-1 h-11 border-violet-300 bg-violet-50/40 text-base text-black focus-visible:border-violet-600 focus-visible:ring-violet-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-base font-bold text-black">Applicant</label>
              <Input
                placeholder="Name (optional)"
                value={formApplicant}
                onChange={(e) => setFormApplicant(e.target.value)}
                className="mt-1 h-11 border-violet-300 bg-violet-50/40 text-base text-black placeholder:text-slate-500 focus-visible:border-violet-600 focus-visible:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="text-base font-bold text-black">Meeting or interview link</label>
            <Input
              type="url"
              inputMode="url"
              placeholder="https://meet.google.com/..."
              value={formMeetingLink}
              onChange={(e) => setFormMeetingLink(e.target.value)}
              className="mt-1 h-11 border-violet-300 bg-violet-50/40 text-base text-black placeholder:text-slate-500 focus-visible:border-violet-600 focus-visible:ring-violet-500"
            />
          </div>

          <Textarea
            placeholder="Description / notes (optional)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="min-h-[88px] resize-y border-violet-300 bg-violet-50/40 text-base text-black placeholder:text-slate-500 focus-visible:border-violet-600 focus-visible:ring-violet-500"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-11 flex-1 gap-1.5 text-base bg-violet-600 hover:bg-violet-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {editingEvent ? "Update" : "Save"}
            </Button>
            {editingEvent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteEvent(editingEvent.id)}
                className="h-11 gap-1.5 text-base text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Button (when no date selected) */}
      {!selectedDate && !showAddForm && (
        <div className="border-t border-slate-100 px-3 py-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-xs"
            onClick={() => {
              const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
              openAddForm(todayStr);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task or Interview
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecruiterCalendar;
