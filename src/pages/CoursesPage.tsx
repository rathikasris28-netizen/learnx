import React, { useEffect, useMemo, useState } from 'react';
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
  Building2,
  BarChart3,
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
}

interface Partner {
  id: string;
  organizationName?: string;
  organization_name?: string;
  status?: string;
}

interface Course {
  id: string;
  partnerId?: string | null;
  skillId?: string | null;
  title: string;
  description?: string | null;
  programType?: string;
  level?: string | null;
  language?: string | null;
  durationHours?: number | null;
  externalUrl?: string | null;
  certificateAvailable?: boolean;
  creditRequired?: number;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  partner?: Partner | null;
  skill?: Skill | null;
}

interface Enrollment {
  id: string;
  programId: string;
  userId: string;
  status: string;
  progressPercentage?: number;
  enrolledAt?: string;
  program?: Course | null;
}

interface CourseProgress {
  id?: string;
  programId?: string;
  userId?: string;
  status?: string;
  progressPercentage?: number;
}

interface CourseFormData {
  partner_id: string;
  skill_id: string;
  title: string;
  description: string;
  level: string;
  language: string;
  duration_hours: string;
  external_url: string;
  certificate_available: boolean;
  credit_required: string;
  status: string;
}

export function CoursesPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ENROLLED'>('ALL');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedCertificate, setSelectedCertificate] = useState('ALL');

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [formData, setFormData] = useState<CourseFormData>({
    partner_id: '',
    skill_id: '',
    title: '',
    description: '',
    level: 'BEGINNER',
    language: 'English',
    duration_hours: '',
    external_url: '',
    certificate_available: false,
    credit_required: '0',
    status: 'PUBLISHED',
  });

  const isAdmin = user?.role === 'ADMIN';

  const resetCourseForm = () => {
    setFormData({
      partner_id: '',
      skill_id: '',
      title: '',
      description: '',
      level: 'BEGINNER',
      language: 'English',
      duration_hours: '',
      external_url: '',
      certificate_available: false,
      credit_required: '0',
      status: 'PUBLISHED',
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const courseResponse = await apiRequest<
        Course[] | { courses?: Course[] }
      >('/courses');

      const loadedCourses = Array.isArray(courseResponse)
        ? courseResponse
        : Array.isArray(courseResponse?.courses)
          ? courseResponse.courses
          : [];

      setCourses(loadedCourses);

      if (user) {
        const enrollmentResponse = await apiRequest<
          Enrollment[] | { enrollments?: Enrollment[] }
        >('/my-courses');

        const loadedEnrollments = Array.isArray(enrollmentResponse)
          ? enrollmentResponse
          : Array.isArray(enrollmentResponse?.enrollments)
            ? enrollmentResponse.enrollments
            : [];

        setMyEnrollments(loadedEnrollments);
      } else {
        setMyEnrollments([]);
      }

      if (isAdmin) {
        const [partnerResponse, skillResponse] = await Promise.all([
          apiRequest<Partner[]>('/partners'),
          apiRequest<Skill[] | { skills?: Skill[] }>('/skills'),
        ]);

        setPartners(
          Array.isArray(partnerResponse) ? partnerResponse : []
        );

        setSkills(
          Array.isArray(skillResponse)
            ? skillResponse
            : Array.isArray(skillResponse?.skills)
              ? skillResponse.skills
              : []
        );
      } else {
        setPartners([]);
        setSkills([]);
      }
    } catch (cause: any) {
      setError(cause?.message || 'Failed to load courses.');
      setCourses([]);
      setMyEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [user?.user_id, isAdmin]);

  const categories = useMemo(() => {
    const values = courses
      .map((course) => course.skill?.name || 'General')
      .filter(Boolean);

    return ['ALL', ...Array.from(new Set(values))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return courses.filter((course) => {
      const skillName = course.skill?.name || 'General';

      const partnerName =
        course.partner?.organizationName ||
        course.partner?.organization_name ||
        '';

      const matchesSearch =
        !query ||
        course.title.toLowerCase().includes(query) ||
        (course.description || '').toLowerCase().includes(query) ||
        skillName.toLowerCase().includes(query) ||
        partnerName.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === 'ALL' ||
        skillName === selectedCategory;

      const matchesLevel =
        selectedLevel === 'ALL' ||
        (course.level || 'BEGINNER') === selectedLevel;

      const matchesCertificate =
        selectedCertificate === 'ALL' ||
        Boolean(course.certificateAvailable) ===
          (selectedCertificate === 'AVAILABLE');

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLevel &&
        matchesCertificate
      );
    });
  }, [
    courses,
    searchQuery,
    selectedCategory,
    selectedLevel,
    selectedCertificate,
  ]);

  const enrolledCourseIds = useMemo(
    () => new Set(myEnrollments.map((item) => item.programId)),
    [myEnrollments]
  );

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      setNotice('Please log in to enroll in a course.');
      return;
    }

    setError('');
    setNotice('');

    try {
      const result = await apiRequest<
        Enrollment & { message?: string }
      >(`/courses/${courseId}/enroll`, {
        method: 'POST',
      });

      await fetchData();
      setActiveTab('ENROLLED');

      setNotice(
        result?.message || 'You are now enrolled in this course.'
      );
    } catch (cause: any) {
      setError(
        cause?.message || 'Failed to enroll in the course.'
      );
    }
  };

  const handleUpdateProgress = async (
    courseId: string,
    currentProgress: number,
    increment: number
  ) => {
    if (!user) {
      setNotice('Please log in to update course progress.');
      return;
    }

    const nextProgress = Math.min(
      100,
      Math.max(0, currentProgress + increment)
    );

    setError('');
    setNotice('');

    try {
      await apiRequest<CourseProgress>(
        `/courses/${courseId}/progress`,
        {
          method: 'PUT',
          body: {
            progress_percentage: nextProgress,
          },
        }
      );

      await fetchData();

      setNotice(
        nextProgress >= 100
          ? 'Course progress reached 100%. Your course is marked as completed.'
          : 'Course progress updated successfully.'
      );
    } catch (cause: any) {
      setError(
        cause?.message || 'Failed to update course progress.'
      );
    }
  };

  const handleCreateCourse = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      setAddError(
        'Only administrators can publish partner courses.'
      );
      return;
    }

    if (!formData.partner_id) {
      setAddError('Please select a partner.');
      return;
    }

    if (!formData.title.trim()) {
      setAddError('Course title is required.');
      return;
    }

    const durationHours = Number(formData.duration_hours);

    if (
      !formData.duration_hours.trim() ||
      !Number.isFinite(durationHours) ||
      durationHours <= 0
    ) {
      setAddError(
        'Duration must be a valid number greater than 0.'
      );
      return;
    }

    const creditRequired = Number(
      formData.credit_required || 0
    );

    if (!Number.isFinite(creditRequired) || creditRequired < 0) {
      setAddError(
        'Time Credits required must be 0 or greater.'
      );
      return;
    }

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      await apiRequest('/courses', {
        method: 'POST',
        body: {
          partner_id: formData.partner_id,
          skill_id: formData.skill_id || null,
          title: formData.title.trim(),
          description:
            formData.description.trim() || null,
          level: formData.level,
          language:
            formData.language.trim() || 'English',
          duration_hours: durationHours,
          external_url:
            formData.external_url.trim() || null,
          certificate_available:
            formData.certificate_available,
          credit_required: creditRequired,
          status: formData.status,
        },
      });

      setAddSuccess('Course published successfully.');
      resetCourseForm();

      await fetchData();

      window.setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess('');
      }, 1000);
    } catch (cause: any) {
      setAddError(
        cause?.message || 'Failed to publish the course.'
      );
    } finally {
      setAddLoading(false);
    }
  };

  const getPartnerName = (course: Course) =>
    course.partner?.organizationName ||
    course.partner?.organization_name ||
    'Partner not specified';

  const getProgress = (enrollment: Enrollment) =>
    Math.min(
      100,
      Math.max(
        0,
        Number(enrollment.progressPercentage || 0)
      )
    );

  return (
    <div className="min-h-screen bg-[#0b0f17] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#0e1726]/80 to-slate-900/90 p-6 shadow-2xl sm:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/80 px-3 py-1 text-xs font-semibold text-cyan-300">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Partner learning catalog</span>
              </div>

              <h1 className="font-['Space_Grotesk'] text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Courses
              </h1>

              <p className="text-sm leading-relaxed text-slate-300">
                Explore structured courses published through the
                LearnX partner ecosystem and track your learning
                progress.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setAddError('');
                  setAddSuccess('');
                  resetCourseForm();
                  setIsAddModalOpen(true);
                }}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add Partner Course
              </button>
            )}
          </div>
        </section>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-cyan-800/50 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-100"
          >
            <span>{notice}</span>

            <button
              onClick={() => setNotice('')}
              className="text-cyan-300 hover:text-white"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-xs text-rose-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />

            <span>{error}</span>

            <button
              onClick={() => setError('')}
              className="ml-auto text-rose-300 hover:text-white"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'border border-slate-700 bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Catalog ({courses.length})
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('ENROLLED')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'ENROLLED'
                    ? 'border border-slate-700 bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="h-4 w-4" />
                My Courses ({myEnrollments.length})
              </button>
            )}
          </div>

          {activeTab === 'ALL' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />

                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <select
                aria-label="Filter by skill"
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value)
                }
                className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'ALL'
                      ? 'All skills'
                      : category}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by level"
                value={selectedLevel}
                onChange={(event) =>
                  setSelectedLevel(event.target.value)
                }
                className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300"
              >
                <option value="ALL">All levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="ELEMENTARY">Elementary</option>
                <option value="INTERMEDIATE">
                  Intermediate
                </option>
                <option value="ADVANCED">Advanced</option>
              </select>

              <select
                aria-label="Filter by certificate"
                value={selectedCertificate}
                onChange={(event) =>
                  setSelectedCertificate(event.target.value)
                }
                className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300"
              >
                <option value="ALL">Any certificate</option>
                <option value="AVAILABLE">
                  Certificate available
                </option>
                <option value="UNAVAILABLE">
                  No certificate
                </option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Loading courses...
          </div>
        ) : activeTab === 'ENROLLED' ? (
          myEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-500" />

              <h3 className="mt-3 text-sm font-bold text-white">
                No enrolled courses
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
                Browse the LearnX course catalog and enroll in a
                course to start tracking your progress.
              </p>

              <button
                onClick={() => setActiveTab('ALL')}
                className="mt-4 rounded-xl bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
              >
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {myEnrollments.map((enrollment) => {
                const course = enrollment.program;

                if (!course) {
                  return null;
                }

                const progress = getProgress(enrollment);
                const completed = progress >= 100;

                return (
                  <div
                    key={enrollment.id}
                    className="flex flex-col justify-between space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-md transition-all hover:border-slate-700"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            {getPartnerName(course)}
                          </span>

                          <h3 className="mt-1 font-['Space_Grotesk'] text-base font-bold text-white">
                            {course.title}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            completed
                              ? 'border-emerald-800/60 bg-emerald-950 text-emerald-300'
                              : 'border-cyan-800/60 bg-cyan-950 text-cyan-300'
                          }`}
                        >
                          {completed
                            ? 'COMPLETED'
                            : `${progress}%`}
                        </span>
                      </div>

                      <p className="line-clamp-3 text-xs leading-relaxed text-slate-400">
                        {course.description ||
                          'No course description provided.'}
                      </p>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Learning Progress</span>

                          <span className="font-semibold text-white">
                            {progress}%
                          </span>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              completed
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-cyan-400" />

                          <span>
                            {course.durationHours != null
                              ? `${course.durationHours} hours`
                              : 'Flexible duration'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-blue-400" />

                          <span>
                            {(course.level || 'BEGINNER').replaceAll(
                              '_',
                              ' '
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                      {!completed ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              void handleUpdateProgress(
                                enrollment.programId,
                                progress,
                                25
                              )
                            }
                            className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                          >
                            +25%
                          </button>

                          <button
                            onClick={() =>
                              void handleUpdateProgress(
                                enrollment.programId,
                                progress,
                                100
                              )
                            }
                            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                          >
                            Complete
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Course completed
                        </div>
                      )}

                      <button
                        onClick={() =>
                          navigate(
                            `/courses/${enrollment.programId}`
                          )
                        }
                        className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        View Course
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-slate-500" />

            <h3 className="mt-3 text-sm font-bold text-white">
              No courses found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
              Try another search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);

              return (
                <div
                  key={course.id}
                  className="group flex flex-col justify-between space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-md transition-all hover:border-slate-700"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                            <Building2 className="h-3 w-3 text-cyan-400" />

                            {getPartnerName(course)}
                          </span>

                          {course.skill && (
                            <span className="rounded-md border border-blue-800/40 bg-blue-950/80 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                              {course.skill.name}
                            </span>
                          )}
                        </div>

                        <h3 className="font-['Space_Grotesk'] text-base font-bold text-white transition-colors group-hover:text-cyan-300">
                          {course.title}
                        </h3>
                      </div>

                      <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300">
                        {course.status || 'PUBLISHED'}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-300">
                      {course.description ||
                        'No description provided for this course.'}
                    </p>

                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800/60 bg-slate-950/50 p-3 text-[11px] text-slate-400 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />

                        <span>
                          Duration:{' '}
                          <strong className="text-slate-200">
                            {course.durationHours != null
                              ? `${course.durationHours} hours`
                              : 'Not specified'}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-400" />

                        <span>
                          Level:{' '}
                          <strong className="text-slate-200">
                            {(course.level || 'BEGINNER').replaceAll(
                              '_',
                              ' '
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />

                        <span>
                          Language:{' '}
                          <strong className="text-slate-200">
                            {course.language || 'English'}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-amber-400" />

                        <span>
                          Certificate:{' '}
                          <strong className="text-slate-200">
                            {course.certificateAvailable
                              ? 'Available'
                              : 'Not available'}
                          </strong>
                        </span>
                      </div>

                      {course.startDate && (
                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <Calendar className="h-3.5 w-3.5 text-blue-400" />

                          <span>
                            Starts:{' '}
                            <strong className="text-slate-200">
                              {new Date(
                                course.startDate
                              ).toLocaleDateString()}
                            </strong>
                          </span>
                        </div>
                      )}

                      {course.creditRequired != null &&
                        course.creditRequired > 0 && (
                          <div className="flex items-center gap-1.5 sm:col-span-2">
                            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />

                            <span>
                              Time Credits required:{' '}
                              <strong className="text-slate-200">
                                {course.creditRequired}
                              </strong>
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                    {course.externalUrl ? (
                      <a
                        href={course.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-cyan-300"
                      >
                        <span>Provider Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        LearnX partner course
                      </span>
                    )}

                    <button
                      onClick={() =>
                        navigate(`/courses/${course.id}`)
                      }
                      className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      View Course
                    </button>

                    {isEnrolled ? (
                      <button
                        onClick={() =>
                          setActiveTab('ENROLLED')
                        }
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-800/60 bg-emerald-950/80 px-4 py-2 text-xs font-semibold text-emerald-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Enrolled
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          void handleEnroll(course.id)
                        }
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-cyan-400 hover:to-blue-500"
                      >
                        Enroll
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-xl space-y-5 rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/20 text-cyan-300">
                  <GraduationCap className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Add Partner Course
                  </h3>

                  <p className="text-xs text-slate-400">
                    Create a real course in the LearnX partner catalog.
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setIsAddModalOpen(false)
                }
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />

                <span>{addError}</span>
              </div>
            )}

            {addSuccess ? (
              <div className="space-y-2 py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />

                <h4 className="text-sm font-bold text-white">
                  Course Published
                </h4>

                <p className="text-xs text-slate-300">
                  {addSuccess}
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleCreateCourse}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Partner *
                  </label>

                  <select
                    required
                    value={formData.partner_id}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        partner_id: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">
                      Select approved partner
                    </option>

                    {partners.map((partner) => (
                      <option
                        key={partner.id}
                        value={partner.id}
                      >
                        {partner.organizationName ||
                          partner.organization_name ||
                          partner.id}
                      </option>
                    ))}
                  </select>

                  {partners.length === 0 && (
                    <p className="mt-1 text-[10px] text-amber-300">
                      No approved partners are currently available.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Course Skill
                  </label>

                  <select
                    value={formData.skill_id}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        skill_id: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">
                      Select skill (optional)
                    </option>

                    {skills.map((skill) => (
                      <option
                        key={skill.id}
                        value={skill.id}
                      >
                        {skill.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Course Title *
                  </label>

                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        title: event.target.value,
                      })
                    }
                    placeholder="e.g. Python for Data Science"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Description
                  </label>

                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        description: event.target.value,
                      })
                    }
                    placeholder="Describe what learners will gain from this course."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Level
                    </label>

                    <select
                      value={formData.level}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          level: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="BEGINNER">
                        Beginner
                      </option>

                      <option value="ELEMENTARY">
                        Elementary
                      </option>

                      <option value="INTERMEDIATE">
                        Intermediate
                      </option>

                      <option value="ADVANCED">
                        Advanced
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Duration (hours) *
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.duration_hours}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          duration_hours:
                            event.target.value,
                        })
                      }
                      placeholder="16"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Language
                    </label>

                    <input
                      type="text"
                      value={formData.language}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          language: event.target.value,
                        })
                      }
                      placeholder="English"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Time Credits Required
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={formData.credit_required}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          credit_required:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Provider Website
                  </label>

                  <input
                    type="url"
                    value={formData.external_url}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        external_url:
                          event.target.value,
                      })
                    }
                    placeholder="https://example.com/course"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div>
                    <span className="block text-xs font-semibold text-white">
                      Certificate Available
                    </span>

                    <span className="text-[10px] text-slate-400">
                      Mark this only when the partner provides a
                      certificate.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      formData.certificate_available
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        certificate_available:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setIsAddModalOpen(false)
                    }
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      addLoading ||
                      partners.length === 0
                    }
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addLoading
                      ? 'Publishing...'
                      : 'Publish Course'}
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

export function CourseDetailPage({
  courseId,
  navigate,
}: {
  courseId: string;
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const courseResponse = await apiRequest<Course>(
          `/courses/${courseId}`
        );

        let currentProgress: CourseProgress | null = null;

        if (user) {
          try {
            currentProgress =
              await apiRequest<CourseProgress | null>(
                `/courses/${courseId}/progress`
              );
          } catch {
            currentProgress = null;
          }
        }

        if (!active) {
          return;
        }

        setCourse(courseResponse);

        const hasEnrollment = Boolean(
          currentProgress?.programId ||
          currentProgress?.id
        );

        setEnrolled(hasEnrollment);

        setProgress(
          Math.min(
            100,
            Math.max(
              0,
              Number(
                currentProgress?.progressPercentage || 0
              )
            )
          )
        );
      } catch (cause: any) {
        if (active) {
          setError(
            cause?.message ||
              'Course details are unavailable.'
          );
          setCourse(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [courseId, user?.user_id]);

  const enroll = async () => {
    if (!user) {
      setNotice('Please log in to continue.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      await apiRequest<Enrollment>(
        `/courses/${courseId}/enroll`,
        {
          method: 'POST',
        }
      );

      setEnrolled(true);
      setProgress(0);

      setNotice(
        'You are now enrolled in this course.'
      );
    } catch (cause: any) {
      setError(
        cause?.message || 'Enrollment failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateProgress = async (
    nextProgress: number
  ) => {
    if (!user || !enrolled) {
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    const safeProgress = Math.min(
      100,
      Math.max(0, nextProgress)
    );

    try {
      const result =
        await apiRequest<CourseProgress>(
          `/courses/${courseId}/progress`,
          {
            method: 'PUT',
            body: {
              progress_percentage: safeProgress,
            },
          }
        );

      const savedProgress = Math.min(
        100,
        Math.max(
          0,
          Number(
            result?.progressPercentage ??
              safeProgress
          )
        )
      );

      setProgress(savedProgress);

      setNotice(
        savedProgress >= 100
          ? 'Course completed and progress saved.'
          : 'Course progress updated.'
      );
    } catch (cause: any) {
      setError(
        cause?.message ||
          'Failed to update course progress.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-slate-400">
        Loading course details...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-sm text-rose-300">
          {error || 'Course not found.'}
        </p>

        <button
          onClick={() => navigate('/courses')}
          className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-xs text-white"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const partnerName =
    course.partner?.organizationName ||
    course.partner?.organization_name ||
    'Partner not specified';

  const completed = progress >= 100;

  return (
    <div className="min-h-screen bg-[#0b0f17] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl space-y-6">
        <button
          onClick={() => navigate('/courses')}
          className="text-xs font-semibold text-cyan-300 hover:text-white"
        >
          ← Back to Courses
        </button>

        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {course.skill && (
              <span className="rounded-md border border-blue-800/50 bg-blue-950/50 px-2.5 py-1 text-[10px] font-semibold text-blue-200">
                {course.skill.name}
              </span>
            )}

            <span className="rounded-md border border-slate-700 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
              {course.status || 'PUBLISHED'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {course.title}
          </h1>

          <p className="text-sm leading-relaxed text-slate-300">
            {course.description ||
              'No description provided for this course.'}
          </p>

          <p className="text-xs text-slate-400">
            Provider:{' '}
            <strong className="text-slate-200">
              {partnerName}
            </strong>
          </p>
        </header>

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-cyan-800/50 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-100"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-xs text-rose-200"
          >
            {error}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [
              'Duration',
              course.durationHours != null
                ? `${course.durationHours} hours`
                : 'Not specified',
            ],
            [
              'Level',
              (course.level || 'BEGINNER').replaceAll(
                '_',
                ' '
              ),
            ],
            [
              'Language',
              course.language || 'English',
            ],
            [
              'Certificate',
              course.certificateAvailable
                ? 'Available'
                : 'Not available',
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
            >
              <dt className="text-[10px] uppercase text-slate-500">
                {label}
              </dt>

              <dd className="mt-1 text-xs font-semibold text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {course.creditRequired != null &&
          course.creditRequired > 0 && (
            <section className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4">
              <p className="text-xs text-cyan-200">
                This course requires{' '}
                <strong>
                  {course.creditRequired} Time Credits
                </strong>
                .
              </p>
            </section>
          )}

        {enrolled && (
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />

                <h2 className="text-sm font-bold text-white">
                  Your Progress
                </h2>
              </div>

              <span className="text-xs font-bold text-cyan-300">
                {progress}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  completed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {!completed && (
                <>
                  <button
                    onClick={() =>
                      void updateProgress(
                        progress + 25
                      )
                    }
                    disabled={submitting}
                    className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    +25% Progress
                  </button>

                  <button
                    onClick={() =>
                      void updateProgress(100)
                    }
                    disabled={submitting}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Complete Course
                  </button>
                </>
              )}

              {completed && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Course completed
                </div>
              )}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
          <button
            onClick={() => void enroll()}
            disabled={enrolled || submitting}
            className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-default disabled:opacity-60"
          >
            {submitting
              ? 'Processing...'
              : enrolled
                ? 'Enrolled'
                : 'Enroll Now'}
          </button>

          {course.externalUrl && (
            <a
              href={course.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Provider Website
            </a>
          )}

          <button
            onClick={() => navigate('/courses')}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Back to Courses
          </button>
        </div>
      </article>
    </div>
  );
}