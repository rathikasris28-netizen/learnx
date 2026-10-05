import React from 'react';
import { Shield, BookOpen } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export default function Footer({ setActiveTab }: FooterProps) {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">LearnX</span>
          <span>— Peer-to-Peer Educational Knowledge Exchange Platform. Learn. Share. Grow.</span>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('terms')}
            className="hover:text-emerald-400 transition flex items-center gap-1.5 font-medium"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Terms & Conditions
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">Not a freelancing or job marketplace. Educational purpose only.</span>
        </div>
      </div>
    </footer>
  );
}
