
import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock3,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Partner {
  id?: string;
  organizationName?: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
}

interface Skill {
  id?: string;
  name?: string;
  category?: string;
}

interface Bootcamp {
  id: string;
  title: string;
  description?: string | null;
  programType?: string;
  level?: string;
  language?: string;
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
  id?: string;
  programId?: string;
  userId?: string;
  status?: string;
  enrolledAt?: string;
}

const formatLevel = (value?: string) => {
  if (!value) {
    return 'ALL LEVELS';
  }

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Date not specified';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMonth = (value?: string | null) => {
  if (!value) {
    return 'Date not specified';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
};

const formatDuration = (
  durationHours?: number | null
) => {
  if (
    durationHours === null ||
    durationHours === undefined
  ) {
    return 'Duration not specified';
  }

  const hours = Number(durationHours);

  if (!Number.isFinite(hours)) {
    return 'Duration not specified';
  }

  if (hours === 1) {
    return '1 hour';
  }

  return `${hours} hours`;
};

export function BootcampsPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [bootcamps, setBootcamps] = useState<
    Bootcamp[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [enrollingId, setEnrollingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [monthFilter, setMonthFilter] =
    useState('ALL');

  const [categoryFilter, setCategoryFilter] =
    useState('ALL');

  const [levelFilter, setLevelFilter] =
    useState('ALL');

  const [statusFilter, setStatusFilter] =
    useState('ALL');

  const fetchBootcamps = async () => {
    setLoading(true);
    setError('');

    try {
      const response =
        await apiRequest<Bootcamp[]>(
          '/bootcamps'
        );

      setBootcamps(
        Array.isArray(response)
          ? response
          : []
      );
    } catch (err: any) {
      setBootcamps([]);

      setError(
        err?.message ||
          'Failed to load bootcamps.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootcamps();
  }, []);

  const handleEnroll = async (
    bootcampId: string
  ) => {
    if (!user) {
      setError(
        'Please log in to continue.'
      );
      return;
    }

    setError('');
    setSuccess('');
    setEnrollingId(bootcampId);

    try {
      const result =
        await apiRequest<Enrollment>(
          `/bootcamps/${bootcampId}/enroll`,
          {
            method: 'POST',
          }
        );

      const selected =
        bootcamps.find(
          (item) =>
            item.id === bootcampId
        );

      setSuccess(
        result?.status
          ? `Registration successful. Status: ${result.status}.`
          : `You are registered for ${
              selected?.title ||
              'this bootcamp'
            }.`
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Enrollment failed.'
      );
    } finally {
      setEnrollingId(null);
    }
  };

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          bootcamps
            .map(
              (item) =>
                item.skill?.category
            )
            .filter(Boolean) as string[]
        )
      ).sort(),
    [bootcamps]
  );

  const months = useMemo(
    () =>
      Array.from(
        new Set(
          bootcamps
            .map((item) =>
              formatMonth(item.startDate)
            )
            .filter(
              (value) =>
                value !== 'Date not specified'
            )
        )
      ),
    [bootcamps]
  );

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          bootcamps
            .map((item) => item.level)
            .filter(Boolean) as string[]
        )
      ).sort(),
    [bootcamps]
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          bootcamps
            .map((item) => item.status)
            .filter(Boolean) as string[]
        )
      ).sort(),
    [bootcamps]
  );

  const filteredBootcamps =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return [...bootcamps]
        .filter((item) => {
          const title =
            item.title || '';

          const description =
            item.description || '';

          const skillName =
            item.skill?.name || '';

          const category =
            item.skill?.category || '';

          const searchableText =
            `${title} ${description} ${skillName} ${category}`
              .toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(query);

          const matchesMonth =
            monthFilter === 'ALL' ||
            formatMonth(
              item.startDate
            ) === monthFilter;

          const matchesCategory =
            categoryFilter === 'ALL' ||
            item.skill?.category ===
              categoryFilter;

          const matchesLevel =
            levelFilter === 'ALL' ||
            item.level === levelFilter;

          const matchesStatus =
            statusFilter === 'ALL' ||
            item.status === statusFilter;

          return (
            matchesSearch &&
            matchesMonth &&
            matchesCategory &&
            matchesLevel &&
            matchesStatus
          );
        })
        .sort((a, b) => {
          const aDate = a.startDate
            ? new Date(
                a.startDate
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

          const bDate = b.startDate
            ? new Date(
                b.startDate
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

          return aDate - bDate;
        });
    }, [
      bootcamps,
      search,
      monthFilter,
      categoryFilter,
      levelFilter,
      statusFilter,
    ]);

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
            Join structured short-term learning
            programs published by LearnX partners.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              navigate('/courses')
            }
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Browse Courses
          </button>

          <button
            type="button"
            onClick={fetchBootcamps}
            disabled={loading}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh bootcamps"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search bootcamps"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
        />

        <select
          aria-label="Filter by month"
          value={monthFilter}
          onChange={(event) =>
            setMonthFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          <option value="ALL">
            All months
          </option>

          {months.map((month) => (
            <option
              key={month}
              value={month}
            >
              {month}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          <option value="ALL">
            All categories
          </option>

          {categories.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            )
          )}
        </select>

        <select
          aria-label="Filter by level"
          value={levelFilter}
          onChange={(event) =>
            setLevelFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          <option value="ALL">
            All levels
          </option>

          {levels.map((level) => (
            <option
              key={level}
              value={level}
            >
              {formatLevel(level)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          <option value="ALL">
            All statuses
          </option>

          {statuses.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading published bootcamps...
        </div>
      ) : filteredBootcamps.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />

          <h3 className="text-sm font-semibold text-slate-800">
            No bootcamps found
          </h3>

          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no published
            bootcamps matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBootcamps.map(
            (bootcamp) => {
              const category =
                bootcamp.skill
                  ?.category ||
                'General';

              const skillName =
                bootcamp.skill?.name;

              const provider =
                bootcamp.partner
                  ?.organizationName ||
                'LearnX Partner';

              const isActive =
                bootcamp.status ===
                'PUBLISHED';

              const isEnrolling =
                enrollingId ===
                bootcamp.id;

              return (
                <div
                  key={bootcamp.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider border border-blue-100">
                        {bootcamp.language ||
                          'ONLINE'}
                      </span>

                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                        {bootcamp.status ||
                          'PUBLISHED'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                      {bootcamp.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {bootcamp.description ||
                        'No description provided.'}
                    </p>

                    <div className="space-y-1.5 pt-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-600" />

                        <span>
                          {category}
                          {skillName
                            ? ` · ${skillName}`
                            : ''}{' '}
                          ·{' '}
                          {formatLevel(
                            bootcamp.level
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-blue-600" />

                        <span>
                          Provider:{' '}
                          {provider}
                        </span>
                      </div>

                      {bootcamp.startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-blue-600" />

                          <span>
                            {formatDate(
                              bootcamp.startDate
                            )}

                            {bootcamp.endDate
                              ? ` – ${formatDate(
                                  bootcamp.endDate
                                )}`
                              : ''}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-blue-600" />

                        <span>
                          Duration:{' '}
                          {formatDuration(
                            bootcamp.durationHours
                          )}
                        </span>
                      </div>

                      {Number(
                        bootcamp.creditRequired ||
                          0
                      ) > 0 && (
                        <div className="text-[10px] text-slate-500">
                          Enrollment requires{' '}
                          {
                            bootcamp.creditRequired
                          }{' '}
                          Time Credits.
                        </div>
                      )}

                      {bootcamp.certificateAvailable && (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          Certificate available
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/bootcamps/${bootcamp.id}`
                        )
                      }
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleEnroll(
                          bootcamp.id
                        )
                      }
                      disabled={
                        !isActive ||
                        isEnrolling
                      }
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isEnrolling
                        ? 'Registering...'
                        : 'Register'}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

export function BootcampDetailPage({
  bootcampId,
  navigate,
}: {
  bootcampId: string;
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [bootcamp, setBootcamp] =
    useState<Bootcamp | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [enrolled, setEnrolled] =
    useState(false);

  const [notice, setNotice] =
    useState('');

  const [error, setError] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const details =
          await apiRequest<Bootcamp>(
            `/bootcamps/${bootcampId}`
          );

        if (!active) {
          return;
        }

        setBootcamp(details);

        if (user) {
          try {
            const enrollment =
              await apiRequest<Enrollment>(
                `/v1/bootcamps/${bootcampId}/enroll`
              );

            if (!active) {
              return;
            }

            setEnrolled(
              Boolean(
                enrollment &&
                  enrollment.programId ===
                    bootcampId
              )
            );
          } catch {
            if (active) {
              setEnrolled(false);
            }
          }
        }
      } catch (cause: any) {
        if (active) {
          setError(
            cause?.message ||
              'Bootcamp details are unavailable.'
          );
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
  }, [
    bootcampId,
    user?.user_id,
  ]);

  const enroll = async () => {
    if (!user) {
      setNotice(
        'Please log in to continue.'
      );
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const result =
        await apiRequest<Enrollment>(
          `/bootcamps/${bootcampId}/enroll`,
          {
            method: 'POST',
          }
        );

      setEnrolled(true);

      setNotice(
        result?.status
          ? `Registration successful. Status: ${result.status}.`
          : 'Registration recorded for your account.'
      );
    } catch (cause: any) {
      setError(
        cause?.message ||
          'Registration failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-slate-500">
        Loading bootcamp details...
      </div>
    );
  }

  if (!bootcamp) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-sm text-rose-600">
          {error ||
            'Bootcamp not found.'}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/bootcamps')
          }
          className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-xs"
        >
          Back to Monthly Bootcamps
        </button>
      </div>
    );
  }

  const provider =
    bootcamp.partner
      ?.organizationName ||
    'LearnX Partner';

  const category =
    bootcamp.skill?.category ||
    'General';

  const skillName =
    bootcamp.skill?.name;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl space-y-6 text-slate-900">
        <button
          type="button"
          onClick={() =>
            navigate('/bootcamps')
          }
          className="text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to Monthly Bootcamps
        </button>

        <header className="space-y-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800">
              {category}
            </span>

            {skillName && (
              <span className="rounded-md bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold text-cyan-800">
                {skillName}
              </span>
            )}

            <span className="rounded-md bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
              {bootcamp.status ||
                'PUBLISHED'}
            </span>
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">
            {bootcamp.title}
          </h1>

          <p className="text-sm leading-relaxed text-slate-600">
            {bootcamp.description ||
              'No description provided.'}
          </p>

          <p className="text-xs text-slate-600">
            Provider:{' '}
            <strong className="text-slate-900">
              {provider}
            </strong>
          </p>
        </header>

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
          >
            {error}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            [
              'Level',
              formatLevel(
                bootcamp.level
              ),
            ],
            [
              'Language',
              bootcamp.language ||
                'English',
            ],
            [
              'Duration',
              formatDuration(
                bootcamp.durationHours
              ),
            ],
            [
              'Start date',
              formatDate(
                bootcamp.startDate
              ),
            ],
            [
              'End date',
              formatDate(
                bootcamp.endDate
              ),
            ],
            [
              'Certificate',
              bootcamp.certificateAvailable
                ? 'Available'
                : 'Not available',
            ],
            [
              'Registration status',
              bootcamp.status ||
                'PUBLISHED',
            ],
            [
              'Time Credits',
              Number(
                bootcamp.creditRequired ||
                  0
              ) > 0
                ? `${bootcamp.creditRequired} TC`
                : 'No credit requirement',
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <dt className="text-[10px] uppercase text-slate-500">
                  {label}
                </dt>

                <dd className="mt-1 text-xs font-semibold">
                  {value}
                </dd>
              </div>
            )
          )}
        </dl>

        {bootcamp.externalUrl && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">
              External program link
            </h2>

            <a
              href={bootcamp.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-700 hover:text-blue-900 break-all"
            >
              {bootcamp.externalUrl}
            </a>
          </section>
        )}

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() =>
              void enroll()
            }
            disabled={
              enrolled ||
              submitting ||
              bootcamp.status !==
                'PUBLISHED'
            }
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting
              ? 'Registering...'
              : enrolled
                ? 'Registered'
                : 'Register / Enroll'}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/bootcamps')
            }
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white"
          >
            Back to Monthly Bootcamps
          </button>
        </div>
      </article>
    </div>
  );
}