
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  BookOpen,
  FileText,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  X,
  Lock,
  Users,
  GraduationCap,
} from 'lucide-react';

import { apiRequest } from '../lib/api';

type NoteType =
  | 'PERSONAL'
  | 'SESSION'
  | 'LEARNING'
  | 'RESOURCE';

type NoteVisibility =
  | 'PRIVATE'
  | 'SESSION_ONLY'
  | 'SHARED';

interface Skill {
  id: string;
  name?: string;
  title?: string;
  category?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;

  noteType?: NoteType;
  note_type?: NoteType;

  visibility?: NoteVisibility;

  attachmentUrl?: string | null;
  attachment_url?: string | null;

  skillId?: string | null;
  skill_id?: string | null;

  createdAt?: string;
  created_at?: string;

  updatedAt?: string;
  updated_at?: string;

  skill?: Skill | null;
}

interface NoteForm {
  title: string;
  content: string;
  note_type: NoteType;
  visibility: NoteVisibility;
  skill_id: string;
  attachment_url: string;
}

const EMPTY_FORM: NoteForm = {
  title: '',
  content: '',
  note_type: 'PERSONAL',
  visibility: 'PRIVATE',
  skill_id: '',
  attachment_url: '',
};

const NOTE_TYPES: Array<{
  value: NoteType;
  label: string;
  description: string;
}> = [
  {
    value: 'PERSONAL',
    label: 'Personal',
    description: 'Your own learning notes',
  },
  {
    value: 'SESSION',
    label: 'Session',
    description: 'Notes from a learning session',
  },
  {
    value: 'LEARNING',
    label: 'Learning',
    description: 'Topics you are studying',
  },
  {
    value: 'RESOURCE',
    label: 'Resource',
    description: 'Useful learning resources',
  },
];

const VISIBILITIES: Array<{
  value: NoteVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you can see this note',
  },
  {
    value: 'SESSION_ONLY',
    label: 'Session Only',
    description: 'Use during a learning session',
  },
  {
    value: 'SHARED',
    label: 'Shared',
    description: 'Can be shared with others',
  },
];

function getNoteType(note: Note): NoteType {
  return note.noteType ?? note.note_type ?? 'PERSONAL';
}

function getVisibility(note: Note): NoteVisibility {
  return note.visibility ?? 'PRIVATE';
}

function getSkillId(note: Note): string {
  return note.skillId ?? note.skill_id ?? '';
}

function getSkillName(skill?: Skill | null): string {
  if (!skill) {
    return '';
  }

  return skill.name ?? skill.title ?? '';
}

function formatDate(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function typeIcon(type: NoteType) {
  switch (type) {
    case 'SESSION':
      return <GraduationCap size={18} />;

    case 'LEARNING':
      return <Lightbulb size={18} />;

    case 'RESOURCE':
      return <BookOpen size={18} />;

    default:
      return <FileText size={18} />;
  }
}

function typeLabel(type: NoteType): string {
  switch (type) {
    case 'SESSION':
      return 'Session';

    case 'LEARNING':
      return 'Learning';

    case 'RESOURCE':
      return 'Resource';

    default:
      return 'Personal';
  }
}

function visibilityIcon(
  visibility: NoteVisibility
) {
  switch (visibility) {
    case 'SHARED':
      return <Share2 size={14} />;

    case 'SESSION_ONLY':
      return <Users size={14} />;

    default:
      return <Lock size={14} />;
  }
}

function visibilityLabel(
  visibility: NoteVisibility
): string {
  switch (visibility) {
    case 'SHARED':
      return 'Shared';

    case 'SESSION_ONLY':
      return 'Session Only';

    default:
      return 'Private';
  }
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');

  const [typeFilter, setTypeFilter] = useState<
    'ALL' | NoteType
  >('ALL');

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  const [form, setForm] =
    useState<NoteForm>(EMPTY_FORM);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiRequest<{
        notes?: Note[];
      }>('/v1/notes');

      setNotes(
        Array.isArray(response?.notes)
          ? response.notes
          : []
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load notes';

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    try {
      const response = await apiRequest<any>(
        '/skills'
      );

      const received =
        Array.isArray(response)
          ? response
          : Array.isArray(response?.skills)
            ? response.skills
            : [];

      setSkills(received);
    } catch {
      /*
       * Skills are optional for notes.
       * Do not block the Notes page if
       * the skills endpoint is unavailable.
       */
      setSkills([]);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
    void loadSkills();
  }, [loadNotes, loadSkills]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccess('');
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes.filter((note) => {
      const type = getNoteType(note);

      if (
        typeFilter !== 'ALL' &&
        type !== typeFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const title =
        note.title?.toLowerCase() ?? '';

      const content =
        note.content?.toLowerCase() ?? '';

      const skill =
        getSkillName(note.skill).toLowerCase();

      return (
        title.includes(query) ||
        content.includes(query) ||
        skill.includes(query)
      );
    });
  }, [notes, search, typeFilter]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (note: Note) => {
    setEditingId(note.id);

    setForm({
      title: note.title ?? '',
      content: note.content ?? '',
      note_type: getNoteType(note),
      visibility: getVisibility(note),
      skill_id: getSkillId(note),
      attachment_url:
        note.attachmentUrl ??
        note.attachment_url ??
        '',
    });

    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = (
    field: keyof NoteForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) {
      setError('Please enter a note title.');
      return;
    }

    if (!content) {
      setError('Please enter note content.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        title,
        content,
        note_type: form.note_type,
        visibility: form.visibility,
        skill_id: form.skill_id || null,
        attachment_url:
          form.attachment_url.trim() || null,
      };

      if (editingId) {
        await apiRequest(
          `/v1/notes/${editingId}`,
          {
            method: 'PUT',
            body: payload,
          }
        );

        setSuccess(
          'Note updated successfully.'
        );
      } else {
        await apiRequest(
          '/v1/notes',
          {
            method: 'POST',
            body: payload,
          }
        );

        setSuccess(
          'Note created successfully.'
        );
      }

      closeForm();
      await loadNotes();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save note';

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: Note) => {
    const confirmed = window.confirm(
      `Delete "${note.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await apiRequest(
        `/v1/notes/${note.id}`,
        {
          method: 'DELETE',
        }
      );

      setNotes((current) =>
        current.filter(
          (item) => item.id !== note.id
        )
      );

      setSuccess(
        'Note deleted successfully.'
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to delete note';

      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <FileText size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                My Learning Notes
              </h1>

              <p className="text-sm text-slate-500">
                Save, organize and review what you
                learn on LearnX.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            New Note
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0"
              aria-label="Close error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Search / Filter */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search your notes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as
                    | 'ALL'
                    | NoteType
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="ALL">
                All note types
              </option>

              <option value="PERSONAL">
                Personal
              </option>

              <option value="SESSION">
                Session
              </option>

              <option value="LEARNING">
                Learning
              </option>

              <option value="RESOURCE">
                Resource
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                void loadNotes();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />

              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Notes
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {notes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Personal
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                notes.filter(
                  (note) =>
                    getNoteType(note) ===
                    'PERSONAL'
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Learning
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                notes.filter(
                  (note) =>
                    getNoteType(note) ===
                    'LEARNING'
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Shared
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                notes.filter(
                  (note) =>
                    getVisibility(note) ===
                    'SHARED'
                ).length
              }
            </p>
          </div>
        </div>

        {/* Notes */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <FileText size={25} />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {notes.length === 0
                ? 'No notes yet'
                : 'No matching notes'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {notes.length === 0
                ? 'Create your first learning note to keep your knowledge organized.'
                : 'Try another search term or change the note type filter.'}
            </p>

            {notes.length === 0 && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus size={18} />
                Create First Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map((note) => {
              const type = getNoteType(note);
              const visibility =
                getVisibility(note);

              return (
                <article
                  key={note.id}
                  className="group flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Card top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        {typeIcon(type)}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-900">
                          {note.title}
                        </h2>

                        <p className="text-xs text-slate-500">
                          {typeLabel(type)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(note)
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                        aria-label="Edit note"
                        title="Edit note"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(note)
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete note"
                        title="Delete note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {note.content}
                  </p>

                  {/* Skill */}
                  {getSkillName(note.skill) && (
                    <div className="mt-4">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {getSkillName(note.skill)}
                      </span>
                    </div>
                  )}

                  {/* Bottom */}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      {visibilityIcon(
                        visibility
                      )}

                      {visibilityLabel(
                        visibility
                      )}
                    </div>

                    <span className="text-xs text-slate-400">
                      {formatDate(
                        note.updatedAt ??
                          note.updated_at ??
                          note.createdAt ??
                          note.created_at
                      )}
                    </span>
                  </div>

                  {/* Attachment */}
                  {(note.attachmentUrl ??
                    note.attachment_url) && (
                    <a
                      href={
                        note.attachmentUrl ??
                        note.attachment_url ??
                        '#'
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 truncate text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      Open attachment
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId
                      ? 'Edit Note'
                      : 'Create New Note'}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Keep your learning knowledge organized.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                {/* Title */}
                <div>
                  <label
                    htmlFor="note-title"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Note Title
                  </label>

                  <input
                    id="note-title"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateForm(
                        'title',
                        event.target.value
                      )
                    }
                    placeholder="e.g. Python Functions"
                    maxLength={150}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Content */}
                <div>
                  <label
                    htmlFor="note-content"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Content
                  </label>

                  <textarea
                    id="note-content"
                    value={form.content}
                    onChange={(event) =>
                      updateForm(
                        'content',
                        event.target.value
                      )
                    }
                    placeholder="Write your learning notes here..."
                    rows={8}
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Note Type
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {NOTE_TYPES.map((item) => {
                      const selected =
                        form.note_type ===
                        item.value;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() =>
                            updateForm(
                              'note_type',
                              item.value
                            )
                          }
                          className={`rounded-xl border p-4 text-left transition ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                selected
                                  ? 'text-indigo-600'
                                  : 'text-slate-500'
                              }
                            >
                              {typeIcon(
                                item.value
                              )}
                            </span>

                            <span className="text-sm font-semibold text-slate-800">
                              {item.label}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Visibility
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {VISIBILITIES.map(
                      (item) => {
                        const selected =
                          form.visibility ===
                          item.value;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() =>
                              updateForm(
                                'visibility',
                                item.value
                              )
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              selected
                                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  selected
                                    ? 'text-indigo-600'
                                    : 'text-slate-500'
                                }
                              >
                                {visibilityIcon(
                                  item.value
                                )}
                              </span>

                              <span className="text-sm font-semibold text-slate-800">
                                {item.label}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.description}
                            </p>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Skill */}
                <div>
                  <label
                    htmlFor="note-skill"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Related Skill
                    <span className="ml-1 font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <select
                    id="note-skill"
                    value={form.skill_id}
                    onChange={(event) =>
                      updateForm(
                        'skill_id',
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">
                      No skill selected
                    </option>

                    {skills.map((skill) => (
                      <option
                        key={skill.id}
                        value={skill.id}
                      >
                        {getSkillName(skill)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attachment */}
                <div>
                  <label
                    htmlFor="note-attachment"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Attachment URL
                    <span className="ml-1 font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <input
                    id="note-attachment"
                    type="url"
                    value={form.attachment_url}
                    onChange={(event) =>
                      updateForm(
                        'attachment_url',
                        event.target.value
                      )
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    )}

                    {saving
                      ? 'Saving...'
                      : editingId
                        ? 'Update Note'
                        : 'Create Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPage;