import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Users, Landmark, Truck, ShieldAlert, LogOut, Search, CheckCircle, Ban, ArrowRight } from 'lucide-react';
import { AdminStats, School, Delivery, Pledge } from '../types';
import { StatCard, StatusBadge, DataTable } from './Shared';

interface AdminDashboardProps {
  currentUser: any;
  onLogout: () => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function AdminDashboard({ currentUser, onLogout, addToast }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'schools' | 'deliveries'>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalSchools: 0,
    pendingApprovals: 0,
    totalItemsPledged: 0,
    totalDeliveriesCompleted: 0
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const r = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchools = async () => {
    try {
      const r = await fetch('/api/admin/schools', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setSchools(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const r = await fetch('/api/admin/deliveries', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setDeliveries(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchSchools(), fetchDeliveries()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUpdateStatus = async (schoolId: number, newStatus: 'approved' | 'suspended') => {
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      addToast(`School status updated to ${newStatus}.`, 'success');
      loadAllData(); // reload statistics
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Filter pending schools for the approvals tab
  const pendingSchools = schools.filter(s => s.status === 'pending');

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row text-chalkboard">
      {/* --- DASHBOARD PERSISTENT SIDEBAR --- */}
      <aside className="w-full md:w-64 bg-chalkboard text-paper flex flex-col justify-between shrink-0 border-r-4 border-chalkboard relative z-20 shadow-[4px_0px_0px_rgba(46,74,61,0.15)]">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b-4 border-black/20 flex items-center gap-2.5 bg-black/10">
            <div className="p-2 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard shadow-[2px_2px_0px_#000] rotate-3">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight leading-none text-white italic">Admin Console</h1>
              <span className="text-[9px] text-pencil uppercase font-mono tracking-widest font-black block mt-1">Supply the Need</span>
            </div>
          </div>
 
          {/* Nav Items */}
          <nav className="p-4 space-y-2.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Overview Stats
            </button>
 
            <button
              onClick={() => setActiveTab('pending')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Pending Approvals
              </div>
              {pendingSchools.length > 0 && (
                <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md font-black border border-black shadow-[1px_1px_0px_#000]">
                  {pendingSchools.length}
                </span>
              )}
            </button>
 
            <button
              onClick={() => setActiveTab('schools')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'schools'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Landmark className="w-4 h-4 shrink-0" />
              All Schools / NGOs
            </button>
 
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'deliveries'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4 shrink-0" />
              Pledge Deliveries
            </button>
          </nav>
        </div>
 
        {/* User profile details & Logout */}
        <div className="p-4 border-t-4 border-black/20 bg-black/10">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/20 border-2 border-black/40">
            <div className="min-w-0">
              <span className="block text-xs font-black truncate text-white uppercase tracking-wider font-mono">{currentUser.name}</span>
              <span className="block text-[9px] uppercase font-mono text-pencil font-semibold">System Operator</span>
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
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Title */}
            <div>
              <h2 className="text-4xl font-black font-display text-chalkboard italic tracking-tight">
                {activeTab === 'overview' && 'System Analytics'}
                {activeTab === 'pending' && 'NGO Signups Approval Desk'}
                {activeTab === 'schools' && 'Managed School Registries'}
                {activeTab === 'deliveries' && 'Platform Delivery Pipelines'}
              </h2>
              <p className="text-xs font-mono font-bold text-chalkboard/60 mt-1">Logged in as {currentUser.email}</p>
            </div>

            {/* PANEL: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Schools Listed"
                    value={stats.totalSchools}
                    icon={<Landmark className="w-5 h-5" />}
                    description="Approved and pending profiles"
                  />
                  <StatCard
                    title="Pending Signups Review"
                    value={stats.pendingApprovals}
                    icon={<ShieldAlert className="w-5 h-5" />}
                    description="Schools requiring approval"
                    accent={stats.pendingApprovals > 0}
                  />
                  <StatCard
                    title="Total Items Pledged"
                    value={stats.totalItemsPledged}
                    icon={<Users className="w-5 h-5" />}
                    description="Physical supplies committed"
                  />
                  <StatCard
                    title="Deliveries Completed"
                    value={stats.totalDeliveriesCompleted}
                    icon={<Truck className="w-5 h-5" />}
                    description="Safely arrived at schools"
                  />
                </div>

                {/* Approvals Action Banner if pending exist */}
                {stats.pendingApprovals > 0 && (
                  <div className="bg-amber-100 border-3 border-chalkboard p-5 rounded-xl shadow-[4px_4px_0px_#E8B342] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-sans font-black text-sm text-chalkboard">Action Required: Onboarding Queue</h4>
                      <p className="text-xs font-semibold text-chalkboard/80 mt-1">There are {stats.pendingApprovals} school accounts currently waiting to be reviewed. Approved schools are instantly put live in the directory.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className="px-4 py-2.5 bg-chalkboard hover:bg-chalkboard-hover text-paper border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition flex items-center gap-1 shrink-0 self-start sm:self-center cursor-pointer"
                    >
                      Open Review Desk <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: PENDING APPROVALS */}
            {activeTab === 'pending' && (
              <div className="space-y-4">
                <DataTable<School>
                  columns={[
                    {
                      header: 'School / NGO Title',
                      key: 'name',
                      sortable: true,
                      render: (row) => (
                        <div className="flex items-center gap-3">
                          <img 
                            src={row.photo_url} 
                            alt={row.name} 
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-bold text-slate-800">{row.name}</span>
                        </div>
                      )
                    },
                    { header: 'Applicant Email', key: 'email', sortable: true },
                    {
                      header: 'Our Story & Blurb',
                      key: 'blurb',
                      render: (row) => <span className="text-xs text-slate-500 line-clamp-2 max-w-xs">{row.blurb}</span>
                    },
                    {
                      header: 'Status',
                      key: 'status',
                      render: (row) => <StatusBadge status={row.status || 'pending'} />
                    },
                    {
                      header: 'Onboarding Actions',
                      key: 'actions',
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(row.id, 'approved')}
                            className="px-2.5 py-1.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-chalkboard rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#2E4A3D] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_#2E4A3D] transition flex items-center gap-1 cursor-pointer"
                            title="Approve NGO"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(row.id, 'suspended')}
                            className="px-2.5 py-1.5 bg-paper hover:bg-white text-rose-700 border-2 border-rose-700 rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#991b1b] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_#991b1b] transition flex items-center gap-1 cursor-pointer"
                            title="Reject / Reject NGO"
                          >
                            <Ban className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )
                    }
                  ]}
                  data={pendingSchools}
                  searchPlaceholder="Search pending applicants..."
                  searchKey="name"
                  emptyMessage="No pending NGO registrations found. You are all caught up!"
                />
              </div>
            )}

            {/* PANEL: ALL SCHOOLS */}
            {activeTab === 'schools' && (
              <div className="space-y-4">
                <DataTable<School>
                  columns={[
                    {
                      header: 'School Registry Name',
                      key: 'name',
                      sortable: true,
                      render: (row) => (
                        <div className="flex items-center gap-3">
                          <img 
                            src={row.photo_url} 
                            alt={row.name} 
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">{row.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {row.id}</span>
                          </div>
                        </div>
                      )
                    },
                    { header: 'Contact Email', key: 'email', sortable: true },
                    {
                      header: 'Needs Posted',
                      key: 'needs_count',
                      sortable: true,
                      render: (row) => <span className="font-mono font-bold text-slate-600">{row.needs_count} items</span>
                    },
                    {
                      header: 'Account Status',
                      key: 'status',
                      sortable: true,
                      render: (row) => <StatusBadge status={row.status || 'pending'} />
                    },
                    {
                      header: 'Oversight Actions',
                      key: 'actions',
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          {row.status === 'approved' ? (
                            <button
                              onClick={() => handleUpdateStatus(row.id, 'suspended')}
                              className="px-2.5 py-1.5 bg-paper hover:bg-white text-rose-700 border-2 border-rose-700 rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#991b1b] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_#991b1b] transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" /> Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(row.id, 'approved')}
                              className="px-2.5 py-1.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-chalkboard rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#2E4A3D] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_#2E4A3D] transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Reactivate
                            </button>
                          )}
                        </div>
                      )
                    }
                  ]}
                  data={schools}
                  searchPlaceholder="Search school title or location..."
                  searchKey="name"
                  emptyMessage="No school registrations found."
                />
              </div>
            )}

            {/* PANEL: DELIVERIES LOGS */}
            {activeTab === 'deliveries' && (
              <div className="space-y-4">
                <DataTable<any>
                  columns={[
                    {
                      header: 'Pledge Ref',
                      key: 'pledge_id',
                      sortable: true,
                      render: (row) => <span className="font-mono font-bold text-xs text-slate-500">#PLG-{row.pledge_id}</span>
                    },
                    {
                      header: 'Destination School',
                      key: 'school_name',
                      sortable: true,
                      render: (row) => <span className="font-semibold text-slate-800">{row.school_name}</span>
                    },
                    {
                      header: 'Item & Qty Pledged',
                      key: 'need_title',
                      sortable: true,
                      render: (row) => (
                        <div>
                          <span className="block text-slate-800 font-medium">{row.need_title}</span>
                          <span className="block font-mono text-xs font-bold text-chalkboard">Qty: {row.qty}</span>
                        </div>
                      )
                    },
                    { header: 'Donor Name', key: 'donor_name', sortable: true },
                    {
                      header: 'Pledge Status',
                      key: 'pledge_status',
                      sortable: true,
                      render: (row) => <StatusBadge status={row.pledge_status} />
                    },
                    {
                      header: 'Delivery Logistics',
                      key: 'delivery_status',
                      sortable: true,
                      render: (row) => {
                        if (!row.delivery_status) {
                          return <span className="text-xs text-slate-400 italic">Waiting on pickup readiness</span>;
                        }

                        let text = 'Claimed';
                        let badgeColor = 'bg-amber-100 text-amber-800';

                        if (row.delivery_status === 'collected') {
                          text = 'En Route';
                          badgeColor = 'bg-blue-100 text-blue-800';
                        } else if (row.delivery_status === 'delivered') {
                          text = 'Delivered';
                          badgeColor = 'bg-emerald-100 text-emerald-800';
                        }

                        return (
                          <div>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${badgeColor}`}>
                              {text}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1">Rider: {row.volunteer_name}</span>
                          </div>
                        );
                      }
                    }
                  ]}
                  data={deliveries}
                  searchPlaceholder="Search by school, donor or items..."
                  searchKey="school_name"
                  emptyMessage="No physical pledges recorded yet."
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
