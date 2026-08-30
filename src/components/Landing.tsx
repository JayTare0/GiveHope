import React, { useState } from 'react';
import { motion } from 'motion/react';
import { School as SchoolIcon, Heart, Search, Landmark, User, Truck, LogOut, LayoutDashboard, Gift } from 'lucide-react';
import { School } from '../types';

interface LandingProps {
  schools: School[];
  onSelectSchool: (id: number) => void;
  currentUser: any;
  onLogout: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateDashboard: () => void;
  loading: boolean;
}

export default function Landing({
  schools,
  onSelectSchool,
  currentUser,
  onLogout,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateDashboard,
  loading
}: LandingProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.blurb.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate dynamic pledge statistics
  const totalPledged = schools.reduce((sum, s) => sum + (s.total_pledged || 0), 0) || 1240;
  const activeSchoolsCount = schools.length || 14;

  return (
    <div className="bg-paper min-h-screen text-chalkboard flex flex-col font-sans">
      {/* Decorative top border */}
      <div className="h-3 bg-chalkboard w-full" />

      {/* --- PUBLIC HEADER --- */}
      <header className="bg-pencil border-b-4 border-chalkboard text-chalkboard py-4 px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSearchTerm('')}>
          <div className="w-10 h-10 bg-chalkboard flex items-center justify-center rounded-sm rotate-3 shadow-[4px_4px_0px_#1a2d25]">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight italic">Supply the Need</h1>
            <span className="text-[10px] uppercase font-mono tracking-widest text-chalkboard/75 block">School Donation Registry</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold">{currentUser.name}</span>
                <span className="text-[9px] font-mono uppercase bg-chalkboard text-paper px-2 py-0.5 rounded-full border border-black/20">
                  {currentUser.role} Dashboard
                </span>
              </div>
              <button
                onClick={onNavigateDashboard}
                className="flex items-center gap-1.5 px-5 py-2 border-2 border-chalkboard rounded-full text-xs font-bold text-paper bg-chalkboard hover:bg-chalkboard/90 shadow-[3px_3px_0px_#000] -rotate-1 transition cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                onClick={onLogout}
                className="p-2 border-2 border-chalkboard rounded-lg bg-white hover:bg-rose-50 text-rose-600 transition cursor-pointer shadow-[2px_2px_0px_#2E4A3D]"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={onNavigateLogin}
                className="text-xs font-bold uppercase tracking-wider hover:underline cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={onNavigateRegister}
                className="px-6 py-2 bg-chalkboard text-paper rounded-full font-bold shadow-[3px_3px_0px_#000] -rotate-1 cursor-pointer text-xs uppercase tracking-wider hover:bg-chalkboard/90 transition"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>

      {/* --- HERO AREA --- */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-chalkboard p-8 sm:p-10 rounded-xl text-paper shadow-[8px_8px_0px_#E8B342] border-4 border-black rotate-[-0.5deg] overflow-hidden"
        >
          <div className="max-w-2xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-paper/20 text-pencil border border-paper/10 mb-5">
              <Heart className="w-3.5 h-3.5 fill-pencil text-pencil" /> Connecting Neighbors & Classrooms
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black mb-4 leading-tight italic">
              Don't just give money. <br />Give the tools to learn.
            </h2>
            <p className="text-sm sm:text-base opacity-90 leading-relaxed font-sans font-light">
              Unlike cash-based crowdfunding, <span className="font-semibold text-pencil">Supply the Need</span> is a physical item-pledging network. Local verified schools list their precise classroom deficiencies, and generous neighbors commit to supplying actual materials. You buy them, we coordinate the delivery.
            </p>
          </div>

          <div className="sm:absolute top-8 right-10 mt-6 sm:mt-0 flex flex-col items-center rotate-6 shrink-0">
            <div className="w-28 h-28 bg-pencil rounded-full flex flex-col items-center justify-center text-chalkboard border-4 border-chalkboard shadow-lg">
              <span className="text-2xl font-black font-mono">{totalPledged}</span>
              <span className="text-[9px] uppercase font-bold tracking-tight">Items Pledged</span>
            </div>
          </div>
        </motion.div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto text-left">
          <div className="bg-white p-5 border-4 border-chalkboard shadow-[4px_4px_0px_#2E4A3D] rounded-xl flex gap-4 -rotate-1">
            <div className="p-2.5 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard h-fit shadow-[2px_2px_0px_#2E4A3D]">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-sans font-black text-sm text-chalkboard">1. Verified Schools</h4>
              <p className="text-xs text-chalkboard/75 mt-1 leading-relaxed">Admin reviews every school and NGO registry to guarantee accountability.</p>
            </div>
          </div>

          <div className="bg-white p-5 border-4 border-chalkboard shadow-[4px_4px_0px_#2E4A3D] rounded-xl flex gap-4 rotate-1">
            <div className="p-2.5 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard h-fit shadow-[2px_2px_0px_#2E4A3D]">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-sans font-black text-sm text-chalkboard">2. Item Pledges</h4>
              <p className="text-xs text-chalkboard/75 mt-1 leading-relaxed">Browse itemized classroom needs lists and pledge exactly what you can supply.</p>
            </div>
          </div>

          <div className="bg-white p-5 border-4 border-chalkboard shadow-[4px_4px_0px_#2E4A3D] rounded-xl flex gap-4 -rotate-[0.5deg]">
            <div className="p-2.5 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard h-fit shadow-[2px_2px_0px_#2E4A3D]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-sans font-black text-sm text-chalkboard">3. Deliver Direct</h4>
              <p className="text-xs text-chalkboard/75 mt-1 leading-relaxed">Local volunteers or package carriers deliver items directly to teachers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SCHOOLS DIRECTORY --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 flex-1 w-full">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-4 border-chalkboard/15 pt-10 pb-8">
          <div>
            <h3 className="font-display text-3xl font-black italic text-chalkboard">Active School Registries</h3>
            <p className="text-xs text-chalkboard/80 mt-1">Select an approved school profile below to view their needed school supplies and pledge.</p>
          </div>
          
          <div className="relative w-full max-w-sm">
            <Search className="absolute inset-y-0 left-3.5 h-5 w-5 text-chalkboard/50 self-center flex items-center pointer-events-none mt-2.5" />
            <input
              type="text"
              placeholder="Search school name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border-3 border-chalkboard rounded-xl text-sm focus:outline-none focus:bg-white bg-white transition shadow-[3px_3px_0px_#2E4A3D]"
            />
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="text-center py-24">
            <svg className="animate-spin h-10 w-10 text-chalkboard mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-sm text-chalkboard font-bold uppercase tracking-wider">Gathering classroom needs lists...</p>
          </div>
        ) : filteredSchools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSchools.map((school, index) => {
              const needed = school.total_needed || 0;
              const pledged = school.total_pledged || 0;
              const rate = needed > 0 ? Math.min(Math.round((pledged / needed) * 100), 100) : 0;
              
              // Organic rotating angle
              const rotateClass = index % 3 === 0 ? '-rotate-1' : index % 3 === 1 ? 'rotate-1' : '-rotate-[0.5deg]';

              return (
                <motion.div
                  key={school.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white rounded-xl border-4 border-chalkboard overflow-hidden shadow-[6px_6px_0px_rgba(46,74,61,0.25)] hover:shadow-[10px_10px_0px_#2E4A3D] flex flex-col h-full transition-all ${rotateClass}`}
                >
                  {/* Photo Cover */}
                  <div className="h-44 w-full relative bg-paper border-b-4 border-chalkboard">
                    <img
                      src={school.photo_url}
                      alt={school.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 left-2 bg-white border-2 border-chalkboard text-chalkboard px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      Verified NGO
                    </div>
                    <div className="absolute top-4 right-4 bg-pencil border-2 border-chalkboard text-chalkboard px-2 py-1 text-xs font-black rounded-md shadow-[2px_2px_0px_#000] rotate-2">
                      <span className="font-mono">{rate}%</span>
                      <span className="text-[8px] uppercase font-bold tracking-wider ml-1">pledged</span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-display text-2xl font-black text-chalkboard line-clamp-1 italic">{school.name}</h4>
                    <p className="text-xs text-chalkboard/80 line-clamp-3 mt-3 leading-relaxed flex-1">
                      {school.blurb}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-[11px] text-chalkboard/75 mb-1.5 font-mono font-bold">
                        <span>PLEDGED METRIC</span>
                        <span className="font-black text-chalkboard">{pledged} / {needed} ITEMS</span>
                      </div>
                      <div className="h-4 w-full bg-paper border-2 border-chalkboard rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pencil border-r-2 border-chalkboard" 
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onSelectSchool(school.id)}
                      className="mt-6 w-full py-2.5 bg-paper border-2 border-chalkboard font-black text-xs uppercase tracking-wider text-chalkboard hover:bg-pencil transition-colors shadow-[3px_3px_0px_#2E4A3D] rounded-lg cursor-pointer"
                    >
                      VIEW CLASSROOM REGISTRY
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-4 border-chalkboard p-16 text-center shadow-[6px_6px_0px_#2E4A3D]">
            <SchoolIcon className="w-12 h-12 text-chalkboard mx-auto" />
            <h4 className="mt-4 text-lg font-black font-display italic">No schools matching "{searchTerm}"</h4>
            <p className="mt-2 text-xs text-chalkboard/70">Try adjusting your keywords or clearing your query.</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-5 inline-flex px-6 py-2 bg-pencil border-2 border-chalkboard rounded-lg text-xs font-bold text-chalkboard shadow-[2px_2px_0px_#2E4A3D] hover:bg-pencil-hover transition cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        )}
      </main>

      {/* --- PUBLIC FOOTER --- */}
      <footer className="border-t-4 border-chalkboard bg-chalkboard text-paper py-8 px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] gap-4">
        <span>Supply the Need Platform</span>
        <div className="flex flex-wrap gap-6 justify-center">
          <span className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-pencil rounded-full"></div> 
            {activeSchoolsCount} Schools Online
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-pencil rounded-full"></div> 
            Volunteer Carrier Logistics
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-pencil rounded-full"></div> 
            Pure Item-Donation
          </span>
        </div>
        <span>System v1.2</span>
      </footer>
    </div>
  );
}
