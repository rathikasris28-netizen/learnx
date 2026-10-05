import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Award, ArrowRight, ArrowLeft, PlayCircle } from 'lucide-react';

interface CoursesViewProps {
  user: any;
}

export default function CoursesView({ user }: CoursesViewProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [cRes, eRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/courses/enrollments', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
        })
      ]);
      const cData = await cRes.json();
      const eData = await eRes.json();
      if (Array.isArray(cData)) setCourses(cData);
      if (Array.isArray(eData)) setEnrollments(eData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (courseId: number) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
      });
      if (res.ok) {
        await loadData();
        const updated = courses.find(c => c.id === courseId);
        if (updated) setSelectedCourse(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteLesson = async (courseId: number, lessonIndex: number) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonIndex}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const enrolledMap = new Map();
  enrollments.forEach(e => enrolledMap.set(e.course_id, e));

  if (selectedCourse) {
    const enrollment = enrolledMap.get(selectedCourse.id);
    const isEnrolled = !!enrollment;
    const progress = enrollment ? enrollment.progress : 0;

    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedCourse(null)}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Courses
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div>
              <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                {selectedCourse.category} • {selectedCourse.difficulty}
              </span>
              <h1 className="text-3xl font-extrabold text-white mt-3">{selectedCourse.title}</h1>
              <p className="text-slate-300 text-sm mt-2">{selectedCourse.description}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedCourse.duration}</span>
                <span>Instructor: <strong className="text-slate-200">{selectedCourse.instructor}</strong></span>
              </div>
            </div>

            <div>
              {isEnrolled ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center min-w-[200px]">
                  <p className="text-xs text-slate-400 mb-1 font-medium">Your Progress</p>
                  <p className="text-2xl font-bold text-emerald-400 mb-2">{progress}%</p>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleEnroll(selectedCourse.id)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm flex items-center gap-2"
                >
                  Enroll in Course <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" /> Course Modules & Lessons
          </h2>

          <div className="space-y-4">
            {selectedCourse.lessons?.map((lesson: any, idx: number) => {
              return (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-950 border border-indigo-800 rounded-xl flex items-center justify-center text-indigo-400 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{lesson.title}</h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {lesson.duration}
                      </span>
                    </div>
                  </div>

                  {isEnrolled ? (
                    <button
                      onClick={() => handleCompleteLesson(selectedCourse.id, idx)}
                      className="bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900 text-emerald-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Completed
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Enroll to track progress</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <BookOpen className="w-3.5 h-3.5" /> Structured Learning
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Technical & Non-Technical Courses</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Enroll in database-backed courses covering Python, UI/UX, AI, English Communication, and Web Development. Track lessons and persist your learning progress.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading courses from database...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          No courses are available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {courses.map((course) => {
            const enrollment = enrolledMap.get(course.id);
            const isEnrolled = !!enrollment;
            const progress = enrollment ? enrollment.progress : 0;

            return (
              <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                <div>
                  <div className="h-48 overflow-hidden relative cursor-pointer" onClick={() => setSelectedCourse(course)}>
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white">
                      {course.category}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800 px-2.5 py-0.5 rounded-full font-semibold">
                        {course.difficulty}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {course.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 cursor-pointer hover:text-indigo-400 transition" onClick={() => setSelectedCourse(course)}>{course.title}</h3>
                    <p className="text-slate-300 text-sm mb-4">{course.description}</p>
                    
                    {isEnrolled && (
                      <div className="mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <span>Progress</span>
                          <span className="font-bold text-emerald-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {isEnrolled ? (
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="w-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Continue Learning ({progress}%)
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center gap-2"
                    >
                      View & Enroll <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
