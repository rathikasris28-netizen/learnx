import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Tag, Eye, Lock, Globe, Trash2, Edit3, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function NotesPage({ navigate }: { navigate: (path: string) => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('PERSONAL');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/v1/notes');
      setNotes(res.notes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingNote) {
        await apiRequest(`/v1/notes/${editingNote.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title, content, note_type: noteType, visibility })
        });
        setSuccess('Note updated successfully!');
      } else {
        await apiRequest('/v1/notes', {
          method: 'POST',
          body: JSON.stringify({ title, content, note_type: noteType, visibility })
        });
        setSuccess('Note created successfully!');
      }
      setModalOpen(false);
      setEditingNote(null);
      setTitle('');
      setContent('');
      fetchNotes();
    } catch (err: any) {
      setError(err.message || 'Failed to save note.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await apiRequest(`/v1/notes/${id}`, { method: 'DELETE' });
      fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Failed to delete note.');
    }
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteType('PERSONAL');
    setVisibility('PRIVATE');
    setModalOpen(true);
  };

  const openEditModal = (note: any) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNoteType(note.note_type);
    setVisibility(note.visibility);
    setModalOpen(true);
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || n.note_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Space_Grotesk'] tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-blue-600" />
            Learning & Session Notes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Organize personal study reflections, session insights, key takeaways, and learning resources securely.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md hover:bg-blue-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes by title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'PERSONAL', 'SESSION', 'LEARNING', 'RESOURCE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filterType === type ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {type}
            </button>
          ))}
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

      {/* Notes Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading your learning notes...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <FileText className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No notes found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Create your first note to capture key learnings from your peer sessions or personal study paths.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div key={note.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    note.note_type === 'SESSION' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                    note.note_type === 'LEARNING' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    note.note_type === 'RESOURCE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {note.note_type}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]" title={note.visibility}>
                    {note.visibility === 'PRIVATE' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                    <span className="capitalize">{note.visibility.toLowerCase()}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-['Space_Grotesk'] line-clamp-1">{note.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">{new Date(note.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(note)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors" title="Edit Note">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors" title="Delete Note">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-['Space_Grotesk']">
                {editingNote ? 'Edit Note' : 'Create New Learning Note'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python AsyncIO Patterns & Event Loops"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Note Type</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="SESSION">Session Note</option>
                    <option value="LEARNING">Learning Path</option>
                    <option value="RESOURCE">Resource</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="SHARED">Shared (Public)</option>
                    <option value="SESSION_ONLY">Session Participants Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content / Key Takeaways</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write detailed notes, code snippets, key points, or action items..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-md hover:bg-blue-500 transition-all"
                >
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
