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
  schedule?: string;
  requirements?: string;
  syllabus_json: string;
  certificate_eligibility: number;
  status: string;
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
  const [expandedSyllabus, setExpandedSyllabus] = useState<Record<string, boolean>>({});

  // Add Partner Course Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [formData, setFormData] = useState({
    partner_name: '',
    name: '',
    category: 'Cloud & AI',
    description: '',
    duration: '4 Weeks (16 Hours)',
    schedule: 'Tuesdays & Thursdays, 7:00 PM IST',
    requirements: 'Open to all motivated learners',
    syllabus: 'Module 1: Foundations & Architecture\nModule 2: Practical Projects & Lab Work\nModule 3: Advanced Optimization\nModule 4: Final Capstone Assessment',
    certificate_eligibility: true,
    external_url: ''
  });

  const categories = ['ALL', 'Cloud & AI', 'Software Engineering', 'Web Development', 'Communication', 'Data Science'];

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
      navigate('/login');
      return;
    }

    try {
      await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' });
      await fetchData();
      setActiveTab('ENROLLED');
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
    return matchesSearch && matchesCategory;
  });

  const enrolledCourseIds = new Set(myEnrollments.map(e => e.course_id));

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#0e1726]/80 to-slate-900/90 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Verified Partner Academies & Programs</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                Partner Courses & Certifications
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Learn from structured, industry-aligned curriculums created by verified institutional partners, Google Cloud academies, and open universities. Earn tamper-proof completion certificates.
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
                <span>Add Partner Course</span>
              </button>
            </div>
          </div>
        </div>

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
                  placeholder="Search courses or partners..."
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
                Explore our catalog of certified partner courses and enroll to boost your skills alongside peer learning.
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

                      {isCompleted && enr.certificate_eligibility ? (
                        <button
                          onClick={() => navigate('/certificates')}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs shadow-sm hover:from-amber-400 hover:to-orange-500 transition-all flex items-center gap-1.5"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>View Certificate</span>
                        </button>
                      ) : null}
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
              {filteredCourses.map((c, idx) => {
                const isEnrolled = enrolledCourseIds.has(c.id);
                let syllabusList: string[] = [];
                try {
                  syllabusList = JSON.parse(c.syllabus_json || '[]');
                } catch {
                  syllabusList = [];
                }
                const isSyllabusOpen = !!expandedSyllabus[c.id];

                return (
                  <div
                    key={`${c.id}-${idx}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-5 hover:border-slate-700 transition-all shadow-md group"
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                              <Building2 className="h-3 w-3 text-cyan-400" />
                              <span>{c.partner_name || 'Academic Partner'}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800/40 text-blue-300 text-[10px] font-semibold">
                              {c.category}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white font-['Space_Grotesk'] group-hover:text-cyan-300 transition-colors">
                            {c.name}
                          </h3>
                        </div>

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
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
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
                        <span className="text-[11px] text-slate-500">LearnX Partner Track</span>
                      )}

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
                      Organization / Partner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google Cloud Academy / IIT Madras"
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
                      <option value="Cloud & AI">Cloud & AI</option>
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Web Development">Web Development</option>
                      <option value="Communication">Communication</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Cybersecurity">Cybersecurity</option>
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
