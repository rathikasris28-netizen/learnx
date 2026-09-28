import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Building2,
  Layers
} from 'lucide-react';

interface Course {
  id: string;
  partner_id?: string;
  partner_name?: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  level?: string;
  learning_mode?: string;
  schedule?: string;
  requirements?: string;
  syllabus_json: string;
  learning_outcomes_json?: string;
  certificate_eligibility: number;
  status: string;
  is_demo?: number;
  partner_verified?: number;
  external_url?: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  name: string;
  partner_name?: string;
  category?: string;
  duration?: string;
  schedule?: string;
  certificate_eligibility?: number;
  description?: string;
  progress_percentage: number;
  status: string;
  is_demo?: number;
  enrolled_at: string;
  completed_at?: string;
}

export function CoursesPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ENROLLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedCertificate, setSelectedCertificate] = useState('ALL');
  const [enrollmentNotice, setEnrollmentNotice] = useState('');
  const [expandedSyllabus, setExpandedSyllabus] = useState<Record<string, boolean>>({});

  // Add Partner Course Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [formData, setFormData] = useState({
    partner_name: '',
    name: '',
    category: 'Programming',
    description: '',
    duration: '4 Weeks (16 Hours)',
    level: 'ALL_LEVELS',
    learning_mode: 'ONLINE',
    schedule: 'Tuesdays & Thursdays, 7:00 PM IST',
    requirements: 'Open to all motivated learners',
    syllabus: 'Module 1: Foundations & Architecture\nModule 2: Practical Projects & Lab Work\nModule 3: Advanced Optimization\nModule 4: Final Capstone Assessment',
    certificate_eligibility: true,
    external_url: ''
  });

  const categories = [
    'ALL', 'Programming', 'Artificial Intelligence', 'Data Science', 'Web Development',
    'Cybersecurity', 'Cloud Computing', 'Communication', 'Career Skills', 'Design',
    'Personal Development', ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean)))
  ].filter((category, index, all) => all.indexOf(category) === index);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ courses: Course[] }>('/courses');
      setCourses(res.courses || []);

      if (user) {
        const enrollRes = await apiRequest<{ enrollments: Enrollment[] }>('/my-courses');
        setMyEnrollments(enrollRes.enrollments || []);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      setEnrollmentNotice('Please log in to continue.');
      return;
    }

    try {
      const course = courses.find((item) => item.id === courseId);
      const result = await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' });
      await fetchData();
      setActiveTab('ENROLLED');
      setEnrollmentNotice(course?.is_demo
        ? 'Demo enrollment recorded for your account. No payment or Time Credit transaction was created.'
        : result.message || 'Enrollment recorded for your account.');
    } catch (err: any) {
      alert(err.message || 'Failed to enroll');
    }
  };

  const handleUpdateProgress = async (courseId: string, currentProgress: number, increment: number) => {
    const nextProgress = Math.min(100, currentProgress + increment);
    try {
      await apiRequest(`/courses/${courseId}/progress`, {
        method: 'POST',
        body: { progress: nextProgress }
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      await apiRequest('/courses', {
        method: 'POST',
        body: formData
      });

      setAddSuccess('Partner course published successfully!');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess('');
        fetchData();
      }, 1200);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add partner course');
    } finally {
      setAddLoading(false);
    }
  };

  const toggleSyllabus = (id: string) => {
    setExpandedSyllabus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.partner_name && c.partner_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || c.category === selectedCategory;
    const matchesLevel = selectedLevel === 'ALL' || (c.level || 'ALL_LEVELS') === selectedLevel;
    const matchesDuration = selectedDuration === 'ALL' || c.duration === selectedDuration;
    const matchesCertificate = selectedCertificate === 'ALL' || Boolean(c.certificate_eligibility) === (selectedCertificate === 'AVAILABLE');
    return matchesSearch && matchesCategory && matchesLevel && matchesDuration && matchesCertificate;
  });

  const enrolledCourseIds = new Set(myEnrollments.map(e => e.course_id));
  const catalogCourses = [...filteredCourses].sort((a, b) => Number(Boolean(a.is_demo)) - Number(Boolean(b.is_demo)));
  const durationOptions = Array.from(new Set(courses.map((course) => course.duration).filter(Boolean))).sort();

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#0e1726]/80 to-slate-900/90 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Structured learning catalog</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                Courses
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Explore structured learning courses from our partner ecosystem. Sample entries are clearly marked as demo content.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add a Course</span>
              </button>
            </div>
          </div>
        </div>

        {enrollmentNotice && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-cyan-800/50 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-100">
            <span>{enrollmentNotice}</span>
            <button onClick={() => setEnrollmentNotice('')} className="text-cyan-300 hover:text-white" aria-label="Dismiss message">×</button>
          </div>
        )}

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'ALL'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Catalog ({courses.length})</span>
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('ENROLLED')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'ENROLLED'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="h-4 w-4" />
                <span>My Enrolled Courses ({myEnrollments.length})</span>
              </button>
            )}
          </div>

          {activeTab === 'ALL' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search course name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <select aria-label="Filter by level" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300">
                <option value="ALL">All levels</option>
                {['BEGINNER', 'BEGINNER_TO_INTERMEDIATE', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].map((level) => <option key={level} value={level}>{level.replaceAll('_', ' ')}</option>)}
              </select>
              <select aria-label="Filter by duration" value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)} className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300">
                <option value="ALL">All durations</option>
                {durationOptions.map((duration) => <option key={duration} value={duration}>{duration}</option>)}
              </select>
              <select aria-label="Filter by certificate availability" value={selectedCertificate} onChange={(e) => setSelectedCertificate(e.target.value)} className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300">
                <option value="ALL">Any certificate</option><option value="AVAILABLE">Certificate available</option><option value="UNAVAILABLE">No certificate</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Loading partner courses and programs...
          </div>
        ) : activeTab === 'ENROLLED' ? (
          /* My Enrolled Courses */
          myEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Enrolled Courses Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Browse the course catalog and enroll using your LearnX account.
              </p>
              <button
                onClick={() => setActiveTab('ALL')}
                className="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-semibold text-xs hover:bg-cyan-500/30 transition-colors"
              >
                Browse Course Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myEnrollments.map((enr, idx) => {
                const isCompleted = enr.progress_percentage >= 100;
                return (
                  <div
                    key={`${enr.id}-${idx}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-5 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            {enr.partner_name || 'Academic Partner'}
                          </span>
                          {enr.is_demo ? <span className="ml-2 rounded-md border border-amber-700/60 bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Demo course</span> : null}
                          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                            {enr.name}
                          </h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                        }`}>
                          {isCompleted ? 'COMPLETED' : `${enr.progress_percentage}%`}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {enr.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Curriculum Progress</span>
                          <span className="font-semibold text-white">{enr.progress_percentage}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{ width: `${enr.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{enr.duration}</span>
                        </div>
                        {enr.schedule && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-400" />
                            <span>{enr.schedule}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      {!isCompleted ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateProgress(enr.course_id, enr.progress_percentage, 25)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold transition-colors"
                          >
                            +25% Progress
                          </button>
                          <button
                            onClick={() => handleUpdateProgress(enr.course_id, enr.progress_percentage, 100)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-colors"
                          >
                            Complete Course
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Course Mastered & Verified</span>
                        </div>
                      )}

                      {isCompleted && enr.certificate_eligibility && !enr.is_demo ? (
                        <button
                          onClick={() => navigate('/certificates')}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs shadow-sm hover:from-amber-400 hover:to-orange-500 transition-all flex items-center gap-1.5"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>View Certificate</span>
                        </button>
                      ) : isCompleted && enr.is_demo ? <span className="text-[10px] text-amber-300">Demo completion · no certificate issued</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Course Catalog */
          filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
              <Search className="h-10 w-10 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Matching Courses Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search query or choosing another category filter. You can also add a new partner course.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {catalogCourses.map((c, idx) => {
                const isEnrolled = enrolledCourseIds.has(c.id);
                const previousCourse = catalogCourses[idx - 1];
                const startsSection = !previousCourse || Boolean(previousCourse.is_demo) !== Boolean(c.is_demo);
                let syllabusList: string[] = [];
                try {
                  syllabusList = JSON.parse(c.syllabus_json || '[]');
                } catch {
                  syllabusList = [];
                }
                const isSyllabusOpen = !!expandedSyllabus[c.id];

                return (
                  <React.Fragment key={c.id}>
                  {startsSection && <div className="md:col-span-2 border-b border-slate-800 pb-2"><h2 className="text-sm font-bold text-white">{c.is_demo ? 'Demo courses' : 'Courses'}</h2><p className="mt-1 text-[11px] text-slate-400">{c.is_demo ? 'Sample catalog records for demonstration only.' : 'Catalog entries from the existing LearnX course records.'}</p></div>}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-5 hover:border-slate-700 transition-all shadow-md group">
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                              <Building2 className="h-3 w-3 text-cyan-400" />
                              <span>Partner: {c.partner_name || 'Provider not specified'}</span>
                            </span>
                            {c.is_demo ? <span className="rounded-md border border-amber-700/60 bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Demo course</span> : null}
                            <span className="px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800/40 text-blue-300 text-[10px] font-semibold">
                              {c.category}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white font-['Space_Grotesk'] group-hover:text-cyan-300 transition-colors">
                            {c.name}
                          </h3>
                        </div>

                        <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300">{c.status}</span>
                        {c.certificate_eligibility ? (
                          <span className="shrink-0 px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            <span>Certificate</span>
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {c.description}
                      </p>

                      {/* Meta chips */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>Duration: <strong className="text-slate-200">{c.duration}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-blue-400 shrink-0" /><span>Level: <strong className="text-slate-200">{(c.level || 'ALL_LEVELS').replaceAll('_', ' ')}</strong></span></div>
                        <div className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" /><span>Mode: <strong className="text-slate-200">{(c.learning_mode || 'ONLINE').replaceAll('_', ' ')}</strong></span></div>
                        <div className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-400 shrink-0" /><span>Certificate: <strong className="text-slate-200">{c.certificate_eligibility ? 'Available' : 'Not available'}</strong></span></div>
                        {c.schedule && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>Schedule: <strong className="text-slate-200">{c.schedule}</strong></span>
                          </div>
                        )}
                        {c.requirements && (
                          <div className="sm:col-span-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                            Prerequisites: <span className="text-slate-300">{c.requirements}</span>
                          </div>
                        )}
                      </div>

                      {/* Syllabus accordion */}
                      {syllabusList.length > 0 && (
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden">
                          <button
                            onClick={() => toggleSyllabus(c.id)}
                            className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-cyan-400" />
                              <span>Course Modules ({syllabusList.length})</span>
                            </span>
                            {isSyllabusOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          {isSyllabusOpen && (
                            <div className="px-3.5 pb-3 pt-1 space-y-1.5 border-t border-slate-800/60 text-xs text-slate-300">
                              {syllabusList.map((mod, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2">
                                  <span className="text-cyan-400 font-bold">•</span>
                                  <span>{mod}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom CTA */}
                    <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      {c.external_url ? (
                        <a
                          href={c.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          <span>Partner Portal</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">{c.partner_verified ? 'Verified in LearnX' : 'Provider listing'}</span>
                      )}

                      <button onClick={() => navigate(`/courses/${c.id}`)} className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">View Course</button>

                      {isEnrolled ? (
                        <button
                          onClick={() => setActiveTab('ENROLLED')}
                          className="px-4 py-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Enrolled · View Progress</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnroll(c.id)}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all"
                        >
                          Enroll in Course
                        </button>
                      )}
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>
          )
        )}

      </div>

      {/* Add Partner Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Add Partner Course
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publish a certified curriculum from your institution or organization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addError && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{addError}</span>
              </div>
            )}

            {addSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Course Published!</h4>
                <p className="text-xs text-slate-300">{addSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Provider / Partner Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Your organization name"
                      value={formData.partner_name}
                      onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Course Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Programming">Programming</option>
                      <option value="Artificial Intelligence">Artificial Intelligence</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Web Development">Web Development</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Cloud Computing">Cloud Computing</option>
                      <option value="Communication">Communication</option>
                      <option value="Career Skills">Career Skills</option>
                      <option value="Design">Design</option>
                      <option value="Personal Development">Personal Development</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vertex AI Engineering & Cloud Architecture Track"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide a clear overview of the course outcomes and learning track..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Duration *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 4 Weeks (16 Hours)"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Schedule
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tuesdays & Thursdays, 7:00 PM IST"
                      value={formData.schedule}
                      onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Skill Level</label>
                    <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500">
                      <option value="ALL_LEVELS">All levels</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Learning Mode</label>
                    <select value={formData.learning_mode} onChange={(e) => setFormData({ ...formData, learning_mode: e.target.value })} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500">
                      <option value="ONLINE">Online</option><option value="OFFLINE">In person</option><option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Requirements / Prerequisites
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Basic Python and Git knowledge"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Syllabus Modules (One line per module)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Module 1: ...&#10;Module 2: ...&#10;Module 3: ..."
                    value={formData.syllabus}
                    onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 font-mono text-[11px] placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Certificate Eligibility</span>
                    <span className="text-[10px] text-slate-400">Award a verified certificate upon 100% curriculum completion</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.certificate_eligibility}
                    onChange={(e) => setFormData({ ...formData, certificate_eligibility: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all"
                  >
                    {addLoading ? 'Publishing Course...' : 'Publish Partner Course'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CourseDetailPage({ courseId, navigate }: { courseId: string; navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [courseData, enrollmentData] = await Promise.all([
          apiRequest(`/courses/${courseId}`),
          user ? apiRequest('/my-courses') : Promise.resolve({ enrollments: [] })
        ]);
        if (!active) return;
        setCourse(courseData.course);
        setEnrolled((enrollmentData.enrollments || []).some((enrollment: Enrollment) => enrollment.course_id === courseId));
      } catch (cause: any) {
        if (active) setError(cause.message || 'Course details are unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [courseId, user?.user_id]);

  const enroll = async () => {
    if (!user) {
      setNotice('Please log in to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' });
      setEnrolled(true);
      setNotice(course?.is_demo
        ? 'Demo enrollment recorded for your account. No payment, Time Credit transaction, or real certificate was created.'
        : result.message || 'Enrollment recorded for your account.');
    } catch (cause: any) {
      setError(cause.message || 'Enrollment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const parseList = (value?: string) => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-slate-400">Loading course details...</div>;
  if (!course) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><p className="text-sm text-rose-300">{error || 'Course not found.'}</p><button onClick={() => navigate('/courses')} className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-xs text-white">Back to Courses</button></div>;

  const syllabus = parseList(course.syllabus_json);
  const outcomes = parseList(course.learning_outcomes_json);

  return (
    <div className="min-h-screen bg-[#0b0f17] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => navigate('/courses')} className="text-xs font-semibold text-cyan-300 hover:text-white">← Back to Courses</button>
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {course.is_demo ? <span className="rounded-md border border-amber-700/60 bg-amber-950/50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-300">Demo course · sample data</span> : null}
            <span className="rounded-md border border-blue-800/50 bg-blue-950/50 px-2.5 py-1 text-[10px] font-semibold text-blue-200">{course.category}</span>
            <span className="rounded-md border border-slate-700 px-2.5 py-1 text-[10px] font-semibold text-slate-300">{course.status}</span>
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{course.name}</h1>
          <p className="text-sm leading-relaxed text-slate-300">{course.description}</p>
          <p className="text-xs text-slate-400">Provider: <strong className="text-slate-200">{course.partner_name || 'Not specified'}</strong>{!course.is_demo && course.partner_verified ? <span className="ml-2 text-emerald-300">Verified in LearnX</span> : null}</p>
        </header>

        {notice && <div role="status" className="rounded-xl border border-cyan-800/50 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-100">{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">{error}</div>}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Duration', course.duration],
            ['Level', (course.level || 'ALL_LEVELS').replaceAll('_', ' ')],
            ['Learning mode', (course.learning_mode || 'ONLINE').replaceAll('_', ' ')],
            ['Certificate', course.certificate_eligibility ? 'Available' : 'Not available']
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"><dt className="text-[10px] uppercase text-slate-500">{label}</dt><dd className="mt-1 text-xs font-semibold text-white">{value}</dd></div>)}
        </dl>

        {course.is_demo ? <p className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-200">This is sample demonstration content, not a real-world partnership. Enrollment is recorded for your LearnX account only; no payment, Time Credit charge, or real certificate is issued.</p> : null}
        {course.requirements ? <section className="space-y-2"><h2 className="text-sm font-bold text-white">Requirements</h2><p className="text-xs leading-relaxed text-slate-300">{course.requirements}</p></section> : null}
        {outcomes.length > 0 && <section className="space-y-2"><h2 className="text-sm font-bold text-white">Learning outcomes</h2><ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">{outcomes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        <section className="space-y-2"><h2 className="text-sm font-bold text-white">Syllabus</h2>{syllabus.length ? <ol className="list-decimal space-y-2 pl-5 text-xs text-slate-300">{syllabus.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol> : <p className="text-xs text-slate-400">Syllabus details have not been provided.</p>}</section>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
          <button onClick={() => void enroll()} disabled={enrolled || submitting} className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-default disabled:opacity-60">{submitting ? 'Enrolling...' : enrolled ? 'Enrolled' : 'Enroll Now'}</button>
          {course.external_url && !course.is_demo ? <a href={course.external_url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800">Provider website</a> : null}
          <button onClick={() => navigate('/courses')} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800">Back to Courses</button>
        </div>
      </article>
    </div>
  );
}
