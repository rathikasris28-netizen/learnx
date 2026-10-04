import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnxApi } from '../../services/learnx';
import { BookOpen, Search, PlusCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export const Learn: React.FC = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [skillLevel, setSkillLevel] = useState('BEGINNER');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [learningGoal, setLearningGoal] = useState('');

  useEffect(() => {
    Promise.all([
      learnxApi.getSkills(),
      learnxApi.getMyLearningRequests(),
    ])
      .then(([skillsData, reqsData]) => {
        setSkills(skillsData);
        if (skillsData.length > 0) setSelectedSkillId(skillsData[0].id);
        setMyRequests(reqsData);
      })
      .catch((err) => {
        console.error('Error loading learn data:', err);
        setError('Failed to load skills or learning requests.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId || !learningGoal) return;
    setError(null);
    setSubmitting(true);

    try {
      await learnxApi.createLearningRequest({
        skill_id: selectedSkillId,
        skill_level: skillLevel,
        preferred_language: preferredLanguage,
        learning_goal: learningGoal,
      });

      setSuccessMessage('Learning request created successfully! You can now view AI matches.');
      setLearningGoal('');
      const updatedReqs = await learnxApi.getMyLearningRequests();
      setMyRequests(updatedReqs);
      setTimeout(() => navigate('/matches'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create learning request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSkills = skills.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading learning catalog...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fn-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Learn a New Skill</h1>
          <p className="text-sm text-slate-500">Create a learning request and get matched with expert knowledge sharers.</p>
        </div>
        <button
          onClick={() => navigate('/matches')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <span>View AI Matches</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Create Learning Request Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <PlusCircle className="w-5 h-5 text-indigo-600" />
          <span>Create Learning Request</span>
        </h2>

        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Skill *
              </label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Level *
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="ELEMENTARY">Elementary</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Language *
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Kannada">Kannada</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              What is your specific learning goal? *
            </label>
            <textarea
              required
              rows={3}
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              placeholder="e.g. I want to learn building React components and state management with hooks..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit Learning Request</span>}
          </button>
        </form>
      </div>

      {/* My Learning Requests List */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Your Learning Requests</h2>
        {myRequests.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No learning requests yet. Create one above!</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {myRequests.map((req) => (
              <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 text-base">{req.skills?.name || 'Skill'}</span>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {req.skill_level}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-md">
                      {req.preferred_language}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{req.learning_goal}</p>
                  <p className="text-xs text-slate-400">Created: {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => navigate('/matches')}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition-all self-start sm:self-center"
                >
                  Find Matches
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
