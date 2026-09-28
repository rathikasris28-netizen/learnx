import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Plus, 
  X, 
  Clock, 
  BookOpen, 
  Share2, 
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Skill, SkillLevel } from '../types';

export function OnboardingPage({ navigate }: { navigate: (path: string) => void }) {
  const { user, refreshUser } = useAuth();
  const isMentor = user?.role === 'KNOWLEDGE_SHARER';
  const [step, setStep] = useState(isMentor ? 2 : 1);
  const [skillsCatalog, setSkillsCatalog] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Selections
  const [learnSkills, setLearnSkills] = useState<Array<{ skill_id: string; name: string; level: SkillLevel }>>([]);
  const [shareSkills, setShareSkills] = useState<Array<{
    skill_id: string;
    name: string;
    level: SkillLevel;
    experience: string;
    languages: string[];
    description: string;
    beginner_friendly: boolean;
    skill_proof: string;
  }>>([]);
  const [availability, setAvailability] = useState({
    status: 'ACTIVE',
    available_from: '18:00:00',
    available_until: '21:00:00'
  });
  const [bio, setBio] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [targetSkillLevel, setTargetSkillLevel] = useState<SkillLevel>('INTERMEDIATE');
  const [learningSchedule, setLearningSchedule] = useState('Flexible');
  const [learningInterests, setLearningInterests] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferred_language || 'English');
  const onboardingStep = step === 3 ? 2 : 1;

  // AI Suggestions
  const [aiSuggested, setAiSuggested] = useState<Array<{ name: string; type: 'LEARN' | 'SHARE'; reason: string }>>([]);

  useEffect(() => {
    apiRequest('/skills').then((res) => {
      setSkillsCatalog(res.skills || []);
    }).catch(() => {});
  }, []);

  const toggleLearnSkill = (skill: Skill) => {
    if (learnSkills.some(s => s.skill_id === skill.id)) {
      setLearnSkills(learnSkills.filter(s => s.skill_id !== skill.id));
    } else {
      setLearnSkills([...learnSkills, { skill_id: skill.id, name: skill.name, level: 'BEGINNER' }]);
    }
  };

  const updateLearnLevel = (skillId: string, level: SkillLevel) => {
    setLearnSkills(learnSkills.map(s => s.skill_id === skillId ? { ...s, level } : s));
  };

  const toggleShareSkill = (skill: Skill) => {
    if (shareSkills.some(s => s.skill_id === skill.id)) {
      setShareSkills(shareSkills.filter(s => s.skill_id !== skill.id));
    } else {
      setShareSkills([...shareSkills, {
        skill_id: skill.id,
        name: skill.name,
        level: 'INTERMEDIATE',
        experience: '',
        languages: [preferredLanguage],
        description: '',
        beginner_friendly: true,
        skill_proof: ''
      }]);
    }
  };

  const updateShareLevel = (skillId: string, level: SkillLevel) => {
    setShareSkills(shareSkills.map(s => s.skill_id === skillId ? { ...s, level } : s));
  };

  const updateShareDetails = (skillId: string, field: 'experience' | 'description' | 'beginner_friendly' | 'skill_proof' | 'languages', value: string | boolean | string[]) => {
    setShareSkills((current) => current.map((skill) => skill.skill_id === skillId ? { ...skill, [field]: value } : skill));
  };

  const acceptAiSuggestion = (item: { name: string; type: 'LEARN' | 'SHARE' }) => {
    const skill = skillsCatalog.find((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase());
    if (!skill) return;
    if (item.type === 'LEARN' && !learnSkills.some((selected) => selected.skill_id === skill.id)) {
      setLearnSkills((current) => [...current, { skill_id: skill.id, name: skill.name, level: 'BEGINNER' }]);
    }
    if (item.type === 'SHARE' && !shareSkills.some((selected) => selected.skill_id === skill.id)) {
      setShareSkills((current) => [...current, {
        skill_id: skill.id, name: skill.name, level: 'INTERMEDIATE', experience: '',
        languages: [preferredLanguage], description: '', beginner_friendly: true, skill_proof: ''
      }]);
    }
    setAiSuggested((current) => current.filter((suggestion) => !(suggestion.name === item.name && suggestion.type === item.type)));
  };

  const handleFinish = async () => {
    setFormError('');
    if (isMentor && (!shareSkills.length || shareSkills.some((skill) => !skill.experience.trim() || !skill.description.trim() || !skill.languages.length))) {
      setFormError('Add at least one skill and complete its experience, languages, and description.');
      return;
    }
    if (!isMentor && (!learnSkills.length || !learningGoal.trim())) {
      setFormError('Select at least one skill and add a learning goal.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          learn_skills: isMentor ? [] : learnSkills,
          share_skills: isMentor ? shareSkills : [],
          availability,
          bio,
          learning_goal: learningGoal,
          target_skill_level: targetSkillLevel,
          learning_schedule: learningSchedule,
          learning_interests: learningInterests,
          preferred_language: preferredLanguage,
          mentor_experience: shareSkills.map((skill) => skill.experience).filter(Boolean).join('; '),
          mentor_languages: Array.from(new Set(shareSkills.flatMap((skill) => skill.languages)))
        })
      });
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Steps Progress Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs font-semibold mb-3">
          <span>Personalize Your Experience</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          Welcome to LearnX, {user?.full_name?.split(' ')[0] || 'Friend'}!
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {isMentor ? 'Add the skills, experience, and availability you want learners to see.' : 'Set your learning goals, interests, and availability.'}
        </p>
        {formError && <p role="alert" className="mx-auto mt-4 max-w-2xl rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-left text-xs text-rose-200">{formError}</p>}

        {/* Step Indicator */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 text-xs font-semibold ${onboardingStep === 1 ? 'text-cyan-400' : 'text-slate-500'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${onboardingStep === 1 ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span>{isMentor ? 'Skills to Share' : 'What to Learn'}</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-semibold ${onboardingStep === 2 ? 'text-cyan-400' : 'text-slate-500'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${onboardingStep === 2 ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span>{isMentor ? 'Experience & Availability' : 'Learning Plan & Availability'}</span>
          </div>
        </div>
      </div>

      {/* STEP 1: What do you want to learn? */}
      {!isMentor && step === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                  What skills do you want to learn?
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select one or more skills. For each skill, specify your current proficiency level.
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-semibold">
                {learnSkills.length} selected
              </span>
            </div>

            {/* AI Suggestions Box (Explicit confirmation required) */}
            {aiSuggested.filter(s => s.type === 'LEARN').length > 0 && (
              <div className="mb-6 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>AI Suggestions (Requires Your Confirmation to Add)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggested.filter(s => s.type === 'LEARN').map((s) => (
                    <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span className="font-semibold text-white">{s.name}</span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">{s.reason}</span>
                      <button
                        type="button"
                        onClick={() => acceptAiSuggestion(s)}
                        className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {skillsCatalog.map((skill) => {
                const isSelected = learnSkills.some(s => s.skill_id === skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleLearnSkill(skill)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold">{skill.category}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-xs font-semibold">{skill.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Configure Levels for Selected Skills */}
            {learnSkills.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <h3 className="text-xs font-semibold text-slate-300 mb-3">
                  Specify Your Starting Level for Selected Skills:
                </h3>
                <div className="space-y-3">
                  {learnSkills.map((ls) => (
                    <div key={ls.skill_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-2">
                      <div className="text-xs font-bold text-white">{ls.name}</div>
                      <div className="flex items-center gap-1.5">
                        {(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED'] as SkillLevel[]).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => updateLearnLevel(ls.skill_id, lvl)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              ls.level === lvl
                                ? 'bg-cyan-500 text-white shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(3)}
              disabled={learnSkills.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <span>Next: Skills You Can Share</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: What can you share? */}
      {isMentor && step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-emerald-400" />
                  What knowledge can you share with others?
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  1 Hour of verified sharing awards you 1 Time Credit to spend on learning.
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">
                {shareSkills.length} selected
              </span>
            </div>

            {/* AI Suggestions Box for Sharing */}
            {aiSuggested.filter(s => s.type === 'SHARE').length > 0 && (
              <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>AI Suggestions (Requires Your Confirmation to Add)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggested.filter(s => s.type === 'SHARE').map((s) => (
                    <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span className="font-semibold text-white">{s.name}</span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">{s.reason}</span>
                      <button
                        type="button"
                        onClick={() => acceptAiSuggestion(s)}
                        className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {skillsCatalog.map((skill) => {
                const isSelected = shareSkills.some(s => s.skill_id === skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleShareSkill(skill)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold">{skill.category}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-xs font-semibold">{skill.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Configure Levels for Sharing Skills */}
            {shareSkills.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <h3 className="text-xs font-semibold text-slate-300 mb-3">
                  Your Proficiency Level in Sharing:
                </h3>
                <div className="space-y-3">
                  {shareSkills.map((ss) => (
                    <div key={ss.skill_id} className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs font-bold text-white">{ss.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED'] as SkillLevel[]).map((lvl) => (
                            <button key={lvl} type="button" onClick={() => updateShareLevel(ss.skill_id, lvl)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${ss.level === lvl ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white'}`}>{lvl}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[11px] text-slate-300">Experience *<input value={ss.experience} onChange={(event) => updateShareDetails(ss.skill_id, 'experience', event.target.value)} placeholder="e.g. 3 years" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" /></label>
                        <label className="text-[11px] text-slate-300">Languages *<select multiple value={ss.languages} onChange={(event) => updateShareDetails(ss.skill_id, 'languages', Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">{['English', 'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada', 'Other'].map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
                        <label className="text-[11px] text-slate-300 sm:col-span-2">Skill Description *<textarea value={ss.description} onChange={(event) => updateShareDetails(ss.skill_id, 'description', event.target.value)} rows={2} placeholder={`Describe what you can teach in ${ss.name}`} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" /></label>
                        <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={ss.beginner_friendly} onChange={(event) => updateShareDetails(ss.skill_id, 'beginner_friendly', event.target.checked)} className="accent-emerald-500" />Beginner-friendly</label>
                        <label className="text-[11px] text-slate-300">SkillProof information, if applicable<input value={ss.skill_proof} onChange={(event) => updateShareDetails(ss.skill_id, 'skill_proof', event.target.value)} placeholder="Credential or evidence description" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" /></label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            {!isMentor && <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Back</button>}
            <button
              onClick={() => setStep(3)}
              disabled={shareSkills.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <span>Next: Set Availability & Schedule</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Availability & Bio */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                {isMentor ? 'Mentor Availability & Profile' : 'Learning Plan & Availability'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isMentor ? 'Set when learners can book sessions with you.' : 'Set your learning goal, preferences, and available schedule.'}
              </p>
            </div>

            {isMentor ? (
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 text-xs text-emerald-200">Mentors start with 0 Time Credits and earn credits only through verified sessions.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-300 sm:col-span-2">What do you want to learn? *<textarea required rows={2} value={learningGoal} onChange={(event) => setLearningGoal(event.target.value)} placeholder="Describe the outcome you are working toward" className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600" /></label>
                <label className="text-xs font-semibold text-slate-300">Target Skill Level<select value={targetSkillLevel} onChange={(event) => setTargetSkillLevel(event.target.value as SkillLevel)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white">{(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED'] as SkillLevel[]).map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-300">Preferred Learning Language<select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white">{['English', 'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada', 'Other'].map((language) => <option key={language}>{language}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-300">Preferred Schedule<select value={learningSchedule} onChange={(event) => setLearningSchedule(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white">{['Flexible', 'Weekday mornings', 'Weekday evenings', 'Weekends'].map((schedule) => <option key={schedule}>{schedule}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-300">Learning Interests<textarea rows={2} value={learningInterests} onChange={(event) => setLearningInterests(event.target.value)} placeholder="Topics or projects you are interested in" className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600" /></label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isMentor && <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mentor Availability Status
                </label>
                <select
                  value={availability.status}
                  onChange={(e) => setAvailability({ ...availability, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ACTIVE">Available for session requests</option>
                  <option value="INACTIVE">Not taking requests</option>
                </select>
              </div>}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isMentor ? 'Available From' : 'Preferred Study Time From'}
                </label>
                <input
                  type="time"
                  value={availability.available_from.slice(0, 5)}
                  onChange={(e) => setAvailability({ ...availability, available_from: e.target.value + ':00' })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isMentor ? 'Available Until' : 'Preferred Study Time Until'}
                </label>
                <input
                  type="time"
                  value={availability.available_until.slice(0, 5)}
                  onChange={(e) => setAvailability({ ...availability, available_until: e.target.value + ':00' })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isMentor ? 'Skill Description & Mentor Introduction' : 'Profile Introduction (Optional)'}
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={isMentor ? 'Describe your mentoring approach and topics you enjoy teaching...' : 'Introduce yourself to the LearnX community...'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Summary preview */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
              <div className="font-semibold text-white">Summary Review:</div>
              <div className="text-slate-400">
                {isMentor ? 'Mentor skills' : 'Learning skills'}: <span className="text-cyan-300">{(isMentor ? shareSkills : learnSkills).map((skill) => `${skill.name} (${skill.level})`).join(', ') || 'None'}</span>
              </div>
              {!isMentor && <div className="text-slate-400">Goal: <span className="text-white">{learningGoal || 'Not set'}</span></div>}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(isMentor ? 2 : 1)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? 'Saving Profile...' : isMentor ? 'Complete Mentor Onboarding' : 'Complete Learner Onboarding'}
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
