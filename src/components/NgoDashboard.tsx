import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Gift, FileText, Settings, LogOut, Plus, Edit, Trash, PlusCircle, MessageSquare, Heart, Truck, Image } from 'lucide-react';
import { NgoStats, Need, Update, Pledge } from '../types';
import { StatCard, StatusBadge, DataTable, Modal } from './Shared';

interface NgoDashboardProps {
  currentUser: any;
  onLogout: () => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const PRESET_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=85',
    label: 'Woodlands Classroom'
  },
  {
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=85',
    label: 'Reading Center'
  },
  {
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=85',
    label: 'Outdoor Classroom'
  },
  {
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85',
    label: 'Art Club Workshop'
  }
];

export default function NgoDashboard({ currentUser, onLogout, addToast }: NgoDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'needs' | 'pledges' | 'updates' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  
  // Dashboard states
  const [stats, setStats] = useState<NgoStats>({
    totalNeeded: 0,
    totalPledged: 0,
    pledgesReceived: 0,
    fulfillmentRate: 0
  });
  const [needs, setNeeds] = useState<Need[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);

  // Profile Settings Form
  const [schoolName, setSchoolName] = useState('');
  const [schoolBlurb, setSchoolBlurb] = useState('');
  const [schoolPhoto, setSchoolPhoto] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [schoolLocation, setSchoolLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Need Modals State
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);
  const [editingNeed, setEditingNeed] = useState<Need | null>(null);
  const [needTitle, setNeedTitle] = useState('');
  const [needCategory, setNeedCategory] = useState('Notebooks');
  const [needGrade, setNeedGrade] = useState('');
  const [needQtyNeeded, setNeedQtyNeeded] = useState(10);

  // Updates Form
  const [updateText, setUpdateText] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  const fetchStats = async () => {
    try {
      const r = await fetch('/api/ngo/stats', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNeeds = async () => {
    try {
      const r = await fetch('/api/ngo/needs', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setNeeds(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPledges = async () => {
    try {
      const r = await fetch('/api/ngo/pledges', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setPledges(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUpdates = async () => {
    try {
      const r = await fetch('/api/ngo/updates', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setUpdates(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfileSettings = async () => {
    if (!currentUser.schoolId) return;
    try {
      const r = await fetch(`/api/public/schools/${currentUser.schoolId}`);
      const data = await r.json();
      if (r.ok && data.school) {
        setSchoolName(data.school.name);
        setSchoolBlurb(data.school.blurb);
        setSchoolPhoto(data.school.photo_url);
        setDeliveryAddress(data.school.delivery_address || '');
        if (typeof data.school.latitude === 'number' && typeof data.school.longitude === 'number') {
          setSchoolLocation({ latitude: data.school.latitude, longitude: data.school.longitude });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchNeeds(), fetchPledges(), fetchUpdates(), fetchProfileSettings()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Open Add Need
  const handleOpenAddNeed = () => {
    setEditingNeed(null);
    setNeedTitle('');
    setNeedCategory('Notebooks');
    setNeedGrade('');
    setNeedQtyNeeded(10);
    setIsNeedModalOpen(true);
  };

  // Open Edit Need
  const handleOpenEditNeed = (need: Need) => {
    setEditingNeed(need);
    setNeedTitle(need.title);
    setNeedCategory(need.category);
    setNeedGrade(need.grade_info);
    setNeedQtyNeeded(need.qty_needed);
    setIsNeedModalOpen(true);
  };

  // Submit Need Creation/Edit
  const handleSubmitNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needTitle.trim() || !needGrade.trim() || needQtyNeeded <= 0) {
      addToast('Please input valid supply need fields.', 'error');
      return;
    }

    try {
      const isEdit = editingNeed !== null;
      const url = isEdit ? `/api/ngo/needs/${editingNeed.id}` : '/api/ngo/needs';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: needTitle.trim(),
          category: needCategory,
          grade_info: needGrade.trim(),
          qty_needed: needQtyNeeded
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save need');
      }

      addToast(isEdit ? 'Supply need edited successfully.' : 'New supply need added successfully.', 'success');
      setIsNeedModalOpen(false);
      loadAllData(); // Refresh metrics and list
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Delete Need
  const handleDeleteNeed = async (needId: number) => {
    if (!window.confirm('Are you sure you want to delete this needed supply item? This will also remove any pledges associated with it.')) return;

    try {
      const response = await fetch(`/api/ngo/needs/${needId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete need');
      }

      addToast('Supply need deleted.', 'success');
      loadAllData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Publish Update Log
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    setPostingUpdate(true);
    try {
      const response = await fetch('/api/ngo/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: updateText.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post update');
      }

      addToast('Timeline update published! Check your public page.', 'success');
      setUpdateText('');
      fetchUpdates(); // Refresh timeline list
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setPostingUpdate(false);
    }
  };

  // School Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolBlurb.trim() || !schoolPhoto.trim()) {
      addToast('Please fill out all page settings fields.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/ngo/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: schoolName.trim(),
          blurb: schoolBlurb.trim(),
          photo_url: schoolPhoto.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      addToast('School profile settings updated successfully.', 'success');
      fetchProfileSettings();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const useCurrentSchoolLocation = () => {
    if (!navigator.geolocation) return addToast('Location is not supported by this browser.', 'error');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSchoolLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        addToast('School location attached. Save the settings to publish it for active deliveries.', 'success');
      },
      () => addToast('Location permission was not granted.', 'error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveDeliveryLocation = async () => {
    if (!deliveryAddress.trim() || !schoolLocation) {
      addToast('Enter the delivery address and use the current-location button first.', 'error');
      return;
    }
    try {
      const response = await fetch('/api/ngo/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ address: deliveryAddress, ...schoolLocation })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save delivery location');
      addToast('Delivery location saved for assigned volunteers.', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // NGO manually requests pickup
  const handleRequestPickup = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/ngo/pledges/${pledgeId}/request-pickup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      addToast('Pledge marked "Ready for Pickup". Volunteers have been notified!', 'success');
      fetchPledges();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const openVolunteerLocation = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/ngo/pledges/${pledgeId}/delivery-location`, {
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

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row text-chalkboard">
      {/* --- DASHBOARD PERSISTENT SIDEBAR --- */}
      <aside className="w-full md:w-64 bg-chalkboard text-paper flex flex-col justify-between shrink-0 border-r-4 border-chalkboard relative z-20 shadow-[4px_0px_0px_rgba(46,74,61,0.15)]">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b-4 border-black/20 flex items-center gap-2.5 bg-black/10">
            <div className="p-2 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard shadow-[2px_2px_0px_#000] rotate-3">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight leading-none text-white italic">NGO Portal</h1>
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
              onClick={() => setActiveTab('needs')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'needs'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Gift className="w-4 h-4 shrink-0" />
              Manage Needs
            </button>

            <button
              onClick={() => setActiveTab('pledges')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'pledges'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 shrink-0" />
                Pledges Received
              </div>
              {pledges.filter(p => p.status === 'pledged').length > 0 && (
                <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md font-black border border-black shadow-[1px_1px_0px_#000]">
                  {pledges.filter(p => p.status === 'pledged').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('updates')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              Publish Updates
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Page Settings
            </button>
          </nav>
        </div>

        {/* User profile details & Logout */}
        <div className="p-4 border-t-4 border-black/20 bg-black/10">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/20 border-2 border-black/40">
            <div className="min-w-0">
              <span className="block text-xs font-black truncate text-white uppercase tracking-wider font-mono">{schoolName || currentUser.name}</span>
              <span className="block text-[9px] uppercase font-mono text-pencil font-semibold">School Coordinator</span>
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

      {/* --- DASHBOARD MAIN CONTAINER --- */}
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black font-display text-chalkboard italic tracking-tight">
                  {activeTab === 'overview' && 'Campaign Health Overview'}
                  {activeTab === 'needs' && 'Classroom Deficiency Registry'}
                  {activeTab === 'pledges' && 'Donor Pledges Registry'}
                  {activeTab === 'updates' && 'Post Campaign Progress'}
                  {activeTab === 'settings' && 'Customize Registry Page'}
                </h2>
                <p className="text-xs font-mono font-bold text-chalkboard/60 mt-1">School Coordinator Panel for {schoolName || currentUser.name}</p>
              </div>

              {activeTab === 'needs' && (
                <button
                  onClick={handleOpenAddNeed}
                  className="px-4 py-2.5 bg-chalkboard hover:bg-chalkboard-hover text-paper border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Add Supply Need
                </button>
              )}
            </div>

            {/* PANEL: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Items Needed"
                    value={stats.totalNeeded}
                    icon={<Gift className="w-5 h-5" />}
                    description="Aggregate school deficiencies"
                  />
                  <StatCard
                    title="Total Items Pledged"
                    value={stats.totalPledged}
                    icon={<Heart className="w-5 h-5" />}
                    description="Pledges made by donors"
                  />
                  <StatCard
                    title="Individual Pledges"
                    value={stats.pledgesReceived}
                    icon={<FileText className="w-5 h-5" />}
                    description="Separate donor packages"
                  />
                  <StatCard
                    title="Campaign Fulfilment"
                    value={`${stats.fulfillmentRate}%`}
                    icon={<Settings className="w-5 h-5" />}
                    description="Fulfillment percentage rate"
                    accent
                  />
                </div>

                {/* Page Link card */}
                <div className="bg-white p-6 rounded-xl border-3 border-chalkboard shadow-[4px_4px_0px_#2E4A3D] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="font-display text-lg font-black italic text-chalkboard">Your Campaign Page is Live!</h4>
                    <p className="text-xs font-semibold text-chalkboard/80 mt-1">Share your page URL so local donors can easily view your classroom needs and commit items.</p>
                  </div>
                  <a
                    href={`/`}
                    className="px-4 py-2.5 bg-pencil text-chalkboard hover:bg-pencil-hover border-3 border-chalkboard rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#2E4A3D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#2E4A3D] transition flex items-center gap-1 shrink-0 cursor-pointer font-sans"
                    onClick={(e) => {
                      e.preventDefault();
                      // We click back to home directory
                      window.location.reload();
                    }}
                  >
                    View Public Campaign Registry
                  </a>
                </div>
              </div>
            )}

            {/* PANEL: MANAGE NEEDS */}
            {activeTab === 'needs' && (
              <div className="space-y-4">
                <DataTable<Need>
                  columns={[
                    { header: 'Supply Item Title', key: 'title', sortable: true },
                    { header: 'Category', key: 'category', sortable: true },
                    { header: 'Grade Allocation', key: 'grade_info', sortable: true },
                    {
                      header: 'Qty Needed',
                      key: 'qty_needed',
                      sortable: true,
                      render: (row) => <span className="font-mono font-bold text-slate-600">{row.qty_needed} items</span>
                    },
                    {
                      header: 'Qty Pledged',
                      key: 'qty_pledged',
                      sortable: true,
                      render: (row) => <span className="font-mono font-bold text-emerald-600">{row.qty_pledged} items</span>
                    },
                    {
                      header: 'Actions',
                      key: 'actions',
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditNeed(row)}
                            className="p-1.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-chalkboard rounded-lg transition shadow-[2px_2px_0px_#2E4A3D] cursor-pointer"
                            title="Edit Need"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNeed(row.id)}
                            className="p-1.5 bg-paper hover:bg-white text-rose-700 border-2 border-rose-700 rounded-lg transition shadow-[2px_2px_0px_#991b1b] cursor-pointer"
                            title="Delete Need"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    }
                  ]}
                  data={needs}
                  searchPlaceholder="Search classroom needs..."
                  searchKey="title"
                  emptyMessage="You haven't posted any school supply deficiencies yet. Get started by clicking 'Add Supply Need'!"
                />
              </div>
            )}

            {/* PANEL: PLEDGES RECEIVED */}
            {activeTab === 'pledges' && (
              <div className="space-y-4">
                <DataTable<Pledge>
                  columns={[
                    {
                      header: 'Donor Name',
                      key: 'donor_name',
                      sortable: true,
                      render: (row) => (
                        <div>
                          <span className="font-bold text-slate-800">{row.donor_name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">Pledge #PLG-{row.id}</span>
                        </div>
                      )
                    },
                    { header: 'Supply Item Pledged', key: 'need_title', sortable: true },
                    {
                      header: 'Quantity',
                      key: 'qty',
                      sortable: true,
                      render: (row) => <span className="font-mono font-bold text-slate-700">{row.qty}x</span>
                    },
                    { header: 'Donor Contacts', key: 'contact' },
                    {
                      header: 'Pledge Status',
                      key: 'status',
                      sortable: true,
                      render: (row) => <StatusBadge status={row.status} />
                    },
                    {
                      header: 'Logistics Actions',
                      key: 'actions',
                      render: (row) => {
                        if (row.status === 'pledged') {
                          return (
                            <button
                              onClick={() => handleRequestPickup(row.id)}
                              className="px-2.5 py-1.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_#000] transition flex items-center gap-1 cursor-pointer"
                              title="Request Pickup"
                            >
                              <Truck className="w-3.5 h-3.5" /> Ready for Pickup
                            </button>
                          );
                        }
                        if (row.status === 'collected') {
                          return <button onClick={() => openVolunteerLocation(row.id)} className="text-xs text-blue-600 font-black uppercase underline cursor-pointer">Track Volunteer</button>;
                        }
                        return <span className="text-xs text-slate-400 italic">Logistics ongoing</span>;
                      }
                    }
                  ]}
                  data={pledges}
                  searchPlaceholder="Search pledges by donor..."
                  searchKey="donor_name"
                  emptyMessage="No donors have pledged physical items yet."
                />
              </div>
            )}

            {/* PANEL: PUBLISH UPDATES */}
            {activeTab === 'updates' && (
              <div className="space-y-6">
                {/* Poster Form */}
                <form onSubmit={handlePostUpdate} className="bg-white p-6 rounded-xl border-3 border-chalkboard shadow-[4px_4px_0px_#2E4A3D] space-y-4">
                  <label className="block text-xs font-black uppercase tracking-wider text-chalkboard font-mono">
                    Post a School Progress Report
                  </label>
                  <textarea
                    required
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    rows={3}
                    placeholder="E.g. We received the pencils and notebooks from John! The 5th Graders started using them immediately. Thank you!"
                    className="block w-full px-4 py-2.5 border-2 border-chalkboard rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-amber-50/10 focus:border-pencil transition text-sm resize-none"
                  />
                  <div className="text-right">
                    <button
                      type="submit"
                      disabled={postingUpdate || !updateText.trim()}
                      className="px-4 py-2.5 border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider text-chalkboard bg-pencil hover:bg-pencil-hover shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition cursor-pointer"
                    >
                      {postingUpdate ? 'Publishing...' : 'Publish Progress Report'}
                    </button>
                  </div>
                </form>

                {/* Timeline display */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-chalkboard uppercase tracking-wider font-mono">Published Update Logs</h4>
                  {updates.length > 0 ? (
                    <div className="space-y-4">
                      {updates.map((update) => (
                        <div key={update.id} className="bg-white p-5 rounded-xl border-2 border-chalkboard shadow-[3px_3px_0px_rgba(46,74,61,0.1)]">
                          <span className="block text-[10px] text-chalkboard/50 font-mono font-bold">
                            {new Date(update.created_at).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-sans">{update.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white/50 border-2 border-dashed border-chalkboard/30 rounded-xl text-chalkboard/60 font-medium italic">
                      You haven't posted any updates yet. Share progress reports when shipments arrive!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PANEL: PAGE SETTINGS */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border-3 border-chalkboard shadow-[4px_4px_0px_#2E4A3D] space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">Delivery Address</label>
                  <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={2} placeholder="School/building, street, area, city" className="block w-full px-4 py-2.5 border-2 border-chalkboard rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-amber-50/10 focus:border-pencil transition text-sm font-sans resize-none" />
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" onClick={useCurrentSchoolLocation} className="text-[10px] font-black uppercase underline cursor-pointer text-chalkboard">{schoolLocation ? '✓ Current location attached' : 'Use current location'}</button>
                    <button type="button" onClick={saveDeliveryLocation} className="text-[10px] font-black uppercase underline cursor-pointer text-chalkboard">Save delivery location</button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Visible only to the volunteer assigned to an active delivery.</p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                    School / NGO Campaign Page Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Hope City Education Center"
                    className="block w-full px-4 py-2.5 border-2 border-chalkboard rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-amber-50/10 focus:border-pencil transition text-sm font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                    Our Story & Purpose *
                  </label>
                  <textarea
                    required
                    value={schoolBlurb}
                    onChange={(e) => setSchoolBlurb(e.target.value)}
                    rows={4}
                    placeholder="Tell local donors who you support and why you need school supplies..."
                    className="block w-full px-4 py-2.5 border-2 border-chalkboard rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-amber-50/10 focus:border-pencil transition text-sm font-sans resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-2.5 font-mono">
                    Select a School Profile Photo
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {PRESET_PHOTOS.map((preset, index) => (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setSchoolPhoto(preset.url)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          schoolPhoto === preset.url
                            ? 'border-chalkboard ring-2 ring-pencil shadow-[2px_2px_0px_#E8B342] scale-102 font-black'
                            : 'border-slate-300 opacity-60 hover:opacity-95'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-[9px] text-white py-0.5 text-center truncate px-1">
                          {preset.label}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Image className="h-4 w-4" />
                    </div>
                    <input
                      type="url"
                      required
                      value={schoolPhoto}
                      onChange={(e) => setSchoolPhoto(e.target.value)}
                      placeholder="Or enter custom image URL"
                      className="block w-full pl-10 pr-4 py-2.5 border-2 border-chalkboard rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-amber-50/10 focus:border-pencil transition text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 text-right">
                  <button
                    type="submit"
                    className="px-4 py-2.5 border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider text-chalkboard bg-pencil hover:bg-pencil-hover shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition cursor-pointer"
                  >
                    Save Page Settings
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* --- ADD/EDIT NEED MODAL --- */}
      <Modal
        isOpen={isNeedModalOpen}
        onClose={() => setIsNeedModalOpen(false)}
        title={editingNeed ? 'Edit Supply Need' : 'Add New Supply Need'}
      >
        <form onSubmit={handleSubmitNeed} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
              Supply Item Title *
            </label>
            <input
              type="text"
              required
              value={needTitle}
              onChange={(e) => setNeedTitle(e.target.value)}
              placeholder="e.g. Wooden Pencils (Box of 12)"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                Category *
              </label>
              <select
                value={needCategory}
                onChange={(e) => setNeedCategory(e.target.value)}
                className="w-full px-3 py-1.5 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition text-sm bg-white"
              >
                <option value="Notebooks">Notebooks</option>
                <option value="Stationery">Stationery</option>
                <option value="Bags">Bags</option>
                <option value="Art Supplies">Art Supplies</option>
                <option value="Textbooks">Textbooks</option>
                <option value="Other">Other Category</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                Grade Allocation *
              </label>
              <input
                type="text"
                required
                value={needGrade}
                onChange={(e) => setNeedGrade(e.target.value)}
                placeholder="e.g. Grade 1-3, Grade 5"
                className="w-full px-3 py-1.5 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
              Quantity Needed *
            </label>
            <input
              type="number"
              required
              min={editingNeed ? editingNeed.qty_pledged : 1}
              value={needQtyNeeded}
              onChange={(e) => setNeedQtyNeeded(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition font-mono text-sm"
            />
            {editingNeed && (
              <span className="block text-[9px] text-slate-400 mt-1 leading-normal">
                Cannot reduce quantity below already pledged count of <span className="font-bold">{editingNeed.qty_pledged}</span>.
              </span>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsNeedModalOpen(false)}
              className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 border-2 border-chalkboard rounded-xl text-xs font-bold text-chalkboard bg-pencil hover:bg-pencil-hover shadow-[2px_2px_0px_0px_rgba(46,74,61,1)] transition cursor-pointer"
            >
              {editingNeed ? 'Save Changes' : 'Publish Need Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
