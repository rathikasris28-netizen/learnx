import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Award, ArrowRight } from 'lucide-react';

interface CoursesViewProps {
  user: any;
}

export default function CoursesView({ user }: CoursesViewProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
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
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const enrolledIds = enrollments.map(e => e.course_id);

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <BookOpen className="w-3.5 h-3.5" /> Structured Learning
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Technical & Non-Technical Courses</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Enroll in curated courses covering Python, UI/UX, AI, English Communication, and more. Track your lessons and mastery.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading courses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.includes(course.id);
            return (
              <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                <div>
                  <div className="h-48 overflow-hidden relative">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
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
                    <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                    <p className="text-slate-300 text-sm mb-4">{course.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Lessons:</span>
                      {course.lessons?.map((l: any, i: number) => (
                        <div key={i} className="text-xs bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between text-slate-300">
                          <span>{i + 1}. {l.title}</span>
                          <span className="text-slate-500">{l.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {isEnrolled ? (
                    <button disabled className="w-full bg-emerald-950/50 border border-emerald-800 text-emerald-300 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Enrolled & In Progress
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center gap-2"
                    >
                      Enroll in Course <ArrowRight className="w-4 h-4" />
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
