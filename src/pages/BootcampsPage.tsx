import React, { useState, useEffect } from 'react';
import { GraduationCap, Calendar, Clock3, Users, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function BootcampsPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [bootcamps, setBootcamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchBootcamps = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/bootcamps');
      setBootcamps(res.bootcamps || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bootcamps.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootcamps();
  }, []);

  const handleEnroll = async (bootcampId: string) => {
    if (!user) {
      setError('Please log in to continue.');
      return;
    }
    setError('');
    setSuccess('');
    setEnrolling(true);
    try {
      const result = await apiRequest(`/v1/bootcamps/${bootcampId}/enroll`, { method: 'POST' });
      const selected = bootcamps.find((item) => item.id === bootcampId);
      setSuccess(selected?.is_demo
        ? 'Demo registration recorded for your account. No payment or Time Credit transaction was created.'
        : result.message || 'Registration recorded for your account.');
      fetchBootcamps();
    } catch (err: any) {
      setError(err.message || 'Enrollment failed.');
    } finally {
      setEnrolling(false);
    }
  };

  const monthName = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const categories = Array.from(new Set(bootcamps.map((item) => item.category).filter(Boolean))).sort();
  const months = Array.from(new Set(bootcamps.map((item) => monthName(item.start_date))));
  const filteredBootcamps = bootcamps.filter((item) => {
    const title = item.title || item.name || '';
    return title.toLowerCase().includes(search.toLowerCase())
      && (monthFilter === 'ALL' || monthName(item.start_date) === monthFilter)
      && (categoryFilter === 'ALL' || item.category === categoryFilter)
      && (levelFilter === 'ALL' || item.level === levelFilter)
      && (statusFilter === 'ALL' || item.status === statusFilter);
  }).sort((a, b) => Number(Boolean(a.is_demo)) - Number(Boolean(b.is_demo)) || a.start_date.localeCompare(b.start_date));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Space_Grotesk'] tracking-tight flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-600" />
            Monthly Bootcamps
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Join structured short-term learning programs designed for focused skill development.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/courses')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Browse Courses
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bootcamp name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400" />
        <select aria-label="Filter by month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><option value="ALL">All months</option>{months.map((month) => <option key={month} value={month}>{month}</option>)}</select>
        <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><option value="ALL">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
        <select aria-label="Filter by level" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><option value="ALL">All levels</option>{Array.from(new Set(bootcamps.map((item) => item.level).filter(Boolean))).map((level) => <option key={level} value={level}>{level.replaceAll('_', ' ')}</option>)}</select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><option value="ALL">All statuses</option>{Array.from(new Set(bootcamps.map((item) => item.status).filter(Boolean))).map((status) => <option key={status} value={status}>{status}</option>)}</select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading active bootcamps...</div>
      ) : filteredBootcamps.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No active bootcamps right now</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Check back soon for upcoming cohort bootcamps published by our institutional partners.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBootcamps.map((bc, index) => {
            const previous = filteredBootcamps[index - 1];
            const startsSection = !previous || Boolean(previous.is_demo) !== Boolean(bc.is_demo);
            return <React.Fragment key={bc.id}>
            {startsSection && <div className="md:col-span-2 lg:col-span-3 border-b border-slate-200 pb-2"><h2 className="text-sm font-bold text-slate-900">{bc.is_demo ? 'Demo bootcamps' : 'Bootcamps'}</h2><p className="mt-1 text-[11px] text-slate-500">{bc.is_demo ? 'Sample programs for demonstration only; not official external schedules.' : 'Programs from existing LearnX records.'}</p></div>}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-1.5"><span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider border border-blue-100">{bc.mode || 'ONLINE'}</span>{bc.is_demo ? <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">Demo bootcamp</span> : null}</div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{bc.status}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">{bc.title || bc.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{bc.description}</p>

                <div className="space-y-1.5 pt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5 text-blue-600" /><span>{bc.category} · {(bc.level || 'ALL_LEVELS').replaceAll('_', ' ')}</span></div>
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-blue-600" /><span>Provider: {bc.provider_name || 'Not specified'}</span></div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    <span>{monthName(bc.start_date)} · {new Date(`${bc.start_date}T12:00:00`).toLocaleDateString()} – {new Date(`${bc.end_date}T12:00:00`).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-blue-600" /><span>Duration: {bc.duration}</span></div>
                  <div className="text-[10px] text-slate-500">{bc.status === 'ACTIVE' ? 'Registration open' : `Status: ${bc.status}`}{!bc.is_demo && bc.time_credit_cost > 0 ? ` · ${bc.time_credit_cost} TC` : ''}</div>
                </div>
              </div>

              <div className="flex gap-2"><button onClick={() => navigate(`/bootcamps/${bc.id}`)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">View Details</button><button onClick={() => void handleEnroll(bc.id)} disabled={enrolling || bc.status !== 'ACTIVE'} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{enrolling ? 'Registering...' : 'Register'}</button></div>
            </div>
            </React.Fragment>;
          })}
        </div>
      )}

    </div>
  );
}

export function BootcampDetailPage({ bootcampId, navigate }: { bootcampId: string; navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [bootcamp, setBootcamp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [details, enrollmentData] = await Promise.all([
          apiRequest(`/bootcamps/${bootcampId}`),
          user ? apiRequest('/v1/me/enrollments') : Promise.resolve({ bootcamps: [] })
        ]);
        if (!active) return;
        setBootcamp(details.bootcamp);
        setEnrolled((enrollmentData.bootcamps || []).some((item: any) => item.bootcamp_id === bootcampId));
      } catch (cause: any) {
        if (active) setError(cause.message || 'Bootcamp details are unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [bootcampId, user?.user_id]);

  const parseList = (value?: string) => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  };

  const enroll = async () => {
    if (!user) {
      setNotice('Please log in to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await apiRequest(`/v1/bootcamps/${bootcampId}/enroll`, { method: 'POST' });
      setEnrolled(true);
      setNotice(bootcamp?.is_demo
        ? 'Demo registration recorded for your account. No payment or Time Credit transaction was created.'
        : result.message || 'Registration recorded for your account.');
    } catch (cause: any) {
      setError(cause.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-slate-500">Loading bootcamp details...</div>;
  if (!bootcamp) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><p className="text-sm text-rose-600">{error || 'Bootcamp not found.'}</p><button onClick={() => navigate('/bootcamps')} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-xs">Back to Monthly Bootcamps</button></div>;

  const syllabus = parseList(bootcamp.syllabus_json);
  const outcomes = parseList(bootcamp.learning_outcomes_json);
  const month = new Date(`${bootcamp.start_date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl space-y-6 text-slate-900">
        <button onClick={() => navigate('/bootcamps')} className="text-xs font-semibold text-blue-700 hover:text-blue-900">← Back to Monthly Bootcamps</button>
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {bootcamp.is_demo ? <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">Demo bootcamp · sample data</span> : null}
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800">{bootcamp.category}</span>
            <span className="rounded-md bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{bootcamp.status}</span>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{bootcamp.title || bootcamp.name}</h1>
          <p className="text-sm leading-relaxed text-slate-600">{bootcamp.description}</p>
          <p className="text-xs text-slate-600">Provider: <strong className="text-slate-900">{bootcamp.provider_name || 'Not specified'}</strong>{!bootcamp.is_demo && bootcamp.partner_verified ? <span className="ml-2 text-emerald-700">Verified in LearnX</span> : null}</p>
        </header>

        {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</div>}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['Month', month], ['Duration', bootcamp.duration], ['Level', (bootcamp.level || 'ALL_LEVELS').replaceAll('_', ' ')],
            ['Start date', displayDate(bootcamp.start_date)], ['End date', displayDate(bootcamp.end_date)], ['Learning mode', bootcamp.mode || 'ONLINE'],
            ['Certificate', bootcamp.certificate_eligibility ? 'Available' : 'Not available'], ['Registration status', bootcamp.status]
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><dt className="text-[10px] uppercase text-slate-500">{label}</dt><dd className="mt-1 text-xs font-semibold">{value}</dd></div>)}
        </dl>
        {!bootcamp.is_demo && bootcamp.time_credit_cost > 0 ? <p className="text-xs text-slate-600">Enrollment cost: <strong>{bootcamp.time_credit_cost} Time Credits</strong></p> : null}
        {bootcamp.is_demo ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">This is sample demonstration content, not an officially scheduled external program or real-world partnership. Demo registration uses your LearnX account and has no payment or Time Credit cost.</p> : null}
        {bootcamp.requirements ? <section className="space-y-2"><h2 className="text-sm font-bold">Requirements</h2><p className="text-xs leading-relaxed text-slate-600">{bootcamp.requirements}</p></section> : null}
        {outcomes.length > 0 && <section className="space-y-2"><h2 className="text-sm font-bold">Learning outcomes</h2><ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">{outcomes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        <section className="space-y-2"><h2 className="text-sm font-bold">Weekly structure</h2>{syllabus.length ? <ol className="list-decimal space-y-2 pl-5 text-xs text-slate-600">{syllabus.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol> : <p className="text-xs text-slate-500">Weekly structure has not been provided.</p>}</section>
        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5"><button onClick={() => void enroll()} disabled={enrolled || submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{submitting ? 'Registering...' : enrolled ? 'Registered' : 'Register / Enroll'}</button><button onClick={() => navigate('/bootcamps')} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white">Back to Monthly Bootcamps</button></div>
      </article>
    </div>
  );
}
