import React, { useState, useEffect } from 'react';

import { Heart, Landmark, LogOut, Gift, Truck } from 'lucide-react';
import { Pledge } from '../types';
import { StatCard, StatusBadge, DataTable } from './Shared';

interface DonorDashboardProps {
  currentUser: any;
  onLogout: () => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function DonorDashboard({ currentUser, onLogout, addToast }: DonorDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [pledges, setPledges] = useState<Pledge[]>([]);

  const fetchPledges = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/donor/pledges', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setPledges(data);
      } else {
        throw new Error(data.error || 'Failed to fetch pledges');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPledges();
  }, []);

  const handleMarkReady = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/donor/pledges/${pledgeId}/ready`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update pledge status');
      }

      addToast('Pledge marked as Ready for Pickup! A logistics volunteer has been notified.', 'success');
      fetchPledges();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const openVolunteerLocation = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/donor/pledges/${pledgeId}/delivery-location`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const location = await response.json();
      if (!response.ok || location.latitude == null || location.longitude == null) {
        throw new Error('The volunteer has not shared a location yet.');
      }
      window.open(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      addToast(err.message, 'info');
    }
  };

  // Aggregated totals
  const totalItemsPledged = pledges.reduce((sum, p) => sum + p.qty, 0);
  const completedDeliveries = pledges.filter(p => p.status === 'delivered').length;
  const uniqueSchools = Array.from(new Set(pledges.map(p => p.school_id))).length;

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row text-chalkboard">
      {/* --- DASHBOARD SIDEBAR --- */}
      <aside className="w-full md:w-64 bg-chalkboard text-paper flex flex-col justify-between shrink-0 border-r-4 border-chalkboard relative z-20 shadow-[4px_0px_0px_rgba(46,74,61,0.15)]">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b-4 border-black/20 flex items-center gap-2.5 bg-black/10">
            <div className="p-2 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard shadow-[2px_2px_0px_#000] rotate-3">
              <Heart className="w-5 h-5 fill-pencil text-pencil" />
            </div>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight leading-none text-white italic">Donor Hub</h1>
              <span className="text-[9px] text-pencil uppercase font-mono tracking-widest font-black block mt-1">Supply the Need</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000] cursor-default"
            >
              <Heart className="w-4 h-4 shrink-0 fill-chalkboard text-chalkboard" />
              My Pledges Directory
            </button>
          </nav>
        </div>

        {/* Profile Card / Sign Out */}
        <div className="p-4 border-t-4 border-black/20 bg-black/10">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/20 border-2 border-black/40">
            <div className="min-w-0">
              <span className="block text-xs font-black truncate text-white uppercase tracking-wider font-mono">{currentUser.name}</span>
              <span className="block text-[9px] uppercase font-mono text-pencil font-semibold">Registered Donor</span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 hover:border-black transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* --- DASHBOARD CONTENT PANELS --- */}
      <main className="flex-1 p-6 md:p-8 max-h-screen overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center py-24">
            <svg className="animate-spin h-10 w-10 text-chalkboard" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Description */}
            <div>
              <h2 className="text-4xl font-black font-display text-chalkboard italic tracking-tight">My Pledge Tracking Desk</h2>
              <p className="text-xs font-mono font-bold text-chalkboard/60 mt-1">Review the logistics lifecycle status of your physical classroom donations.</p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                title="Schools Supported"
                value={uniqueSchools}
                icon={<Landmark className="w-5 h-5" />}
                description="Community classrooms helped"
              />
              <StatCard
                title="Total Items Pledged"
                value={totalItemsPledged}
                icon={<Gift className="w-5 h-5" />}
                description="Supplies committed by you"
              />
              <StatCard
                title="Deliveries Completed"
                value={completedDeliveries}
                icon={<Truck className="w-5 h-5" />}
                description="Items successfully arrived"
                accent={completedDeliveries > 0}
              />
            </div>

            {/* Table Displaying Pledges */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-chalkboard uppercase tracking-wider font-mono">My Active and Historic Pledges</h3>
              
              <DataTable<Pledge>
                columns={[
                  {
                    header: 'Destination School',
                    key: 'school_name',
                    sortable: true,
                    render: (row) => <span className="font-semibold text-slate-800">{row.school_name}</span>
                  },
                  {
                    header: 'Supply Item Title',
                    key: 'need_title',
                    sortable: true,
                    render: (row) => <span className="font-medium text-slate-700">{row.need_title}</span>
                  },
                  {
                    header: 'Quantity Pledged',
                    key: 'qty',
                    sortable: true,
                    render: (row) => <span className="font-mono font-bold text-slate-700">{row.qty}x</span>
                  },
                  {
                    header: 'Pledged Date',
                    key: 'created_at',
                    sortable: true,
                    render: (row) => (
                      <span className="font-mono text-xs text-slate-400">
                        {new Date(row.created_at).toLocaleDateString()}
                      </span>
                    )
                  },
                  {
                    header: 'Current Status',
                    key: 'status',
                    sortable: true,
                    render: (row) => <StatusBadge status={row.status} />
                  },
                  {
                    header: 'Donation Actions',
                    key: 'actions',
                    render: (row) => {
                      if (row.status === 'pledged') {
                        return (
                          <button
                            onClick={() => handleMarkReady(row.id)}
                            className="px-2.5 py-1.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_#000] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" /> Mark Ready
                          </button>
                        );
                      }
                      if (row.status === 'ready_for_pickup') {
                        return <span className="text-[11px] text-slate-400 italic font-mono font-bold">Awaiting Rider Pickup</span>;
                      }
                      if (row.status === 'collected') {
                        return <button onClick={() => openVolunteerLocation(row.id)} className="text-[11px] text-blue-600 font-black uppercase tracking-wider font-sans underline cursor-pointer">Track Volunteer</button>;
                      }
                      return <span className="text-[11px] text-emerald-700 font-black uppercase tracking-wider font-sans">Completed</span>;
                    }
                  }
                ]}
                data={pledges}
                searchPlaceholder="Search by school or item..."
                searchKey="school_name"
                emptyMessage="You haven't made any supply pledges yet. Explore the directory and support a school!"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
