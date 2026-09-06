import React, { useState, useEffect } from 'react';

import { Truck, Navigation, LogOut, CheckCircle, Package, MapPin, Phone, ClipboardList } from 'lucide-react';
import { Delivery } from '../types';
import { StatCard, StatusBadge, DataTable } from './Shared';

interface DeliveryDashboardProps {
  currentUser: any;
  onLogout: () => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function DeliveryDashboard({ currentUser, onLogout, addToast }: DeliveryDashboardProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'active' | 'completed'>('queue');
  const [loading, setLoading] = useState(false);

  // States
  const [queue, setQueue] = useState<any[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);

  const fetchQueue = async () => {
    try {
      const r = await fetch('/api/delivery/queue', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setQueue(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveDeliveries = async () => {
    try {
      const r = await fetch('/api/delivery/my-deliveries', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setActiveDeliveries(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCompletedDeliveries = async () => {
    try {
      const r = await fetch('/api/delivery/completed', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await r.json();
      if (r.ok) setCompletedDeliveries(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchQueue(), fetchActiveDeliveries(), fetchCompletedDeliveries()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // The volunteer is the moving party. Their browser sends GPS updates only
  // while they have an active, claimed delivery and stops automatically after delivery.
  useEffect(() => {
    if (!activeDeliveries.length || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      await Promise.all(activeDeliveries.map((delivery) => fetch(`/api/delivery/pledges/${delivery.pledge_id}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      })));
    }, () => addToast('Location sharing is off. Allow location access to share delivery progress.', 'info'), {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeDeliveries]);

  const openMap = (latitude?: number | null, longitude?: number | null, address?: string | null) => {
    const destination = latitude != null && longitude != null ? `${latitude},${longitude}` : address;
    if (destination) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`, '_blank', 'noopener,noreferrer');
  };

  // Actions
  const handleClaimPickup = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/delivery/pledges/${pledgeId}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim pickup');
      }

      addToast('Pickup claimed successfully! You can find it under "Active Deliveries".', 'success');
      loadAllData();
      setActiveTab('active'); // Switch to active tab so they see what they just claimed!
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCollectPackage = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/delivery/pledges/${pledgeId}/collect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record collection');
      }

      addToast('Package marked as COLLECTED. Please deliver to school.', 'success');
      loadAllData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDeliverPackage = async (pledgeId: number) => {
    try {
      const response = await fetch(`/api/delivery/pledges/${pledgeId}/deliver`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record delivery');
      }

      addToast('Package marked as DELIVERED! Thank you for your volunteer service.', 'success');
      loadAllData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row text-chalkboard">
      {/* --- SIDEBAR NAV --- */}
      <aside className="w-full md:w-64 bg-chalkboard text-paper flex flex-col justify-between shrink-0 border-r-4 border-chalkboard relative z-20 shadow-[4px_0px_0px_rgba(46,74,61,0.15)]">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b-4 border-black/20 flex items-center gap-2.5 bg-black/10">
            <div className="p-2 bg-paper text-chalkboard rounded-lg border-2 border-chalkboard shadow-[2px_2px_0px_#000] rotate-3">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight leading-none text-white italic">Rider Desk</h1>
              <span className="text-[9px] text-pencil uppercase font-mono tracking-widest font-black block mt-1">Supply the Need</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-2.5">
            <button
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Navigation className="w-4 h-4 shrink-0" />
                Pickup Queue
              </div>
              {queue.length > 0 && (
                <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md font-black border border-black shadow-[1px_1px_0px_#000]">
                  {queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 shrink-0" />
                Active Deliveries
              </div>
              {activeDeliveries.length > 0 && (
                <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md font-black border border-black shadow-[1px_1px_0px_#000]">
                  {activeDeliveries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-pencil text-chalkboard border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'text-paper/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              Completed History
            </button>
          </nav>
        </div>

        {/* Profile Card / Logout */}
        <div className="p-4 border-t-4 border-black/20 bg-black/10">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/20 border-2 border-black/40">
            <div className="min-w-0">
              <span className="block text-xs font-black truncate text-white uppercase tracking-wider font-mono">{currentUser.name}</span>
              <span className="block text-[9px] uppercase font-mono text-pencil font-semibold">Logistics Volunteer</span>
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

      {/* --- MAIN DISPLAY --- */}
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
              <h2 className="text-4xl font-black font-display text-chalkboard italic tracking-tight">
                {activeTab === 'queue' && 'Available Pickups Queue'}
                {activeTab === 'active' && 'My Active Logistics Tasks'}
                {activeTab === 'completed' && 'My Completed Deliveries History'}
              </h2>
              <p className="text-xs font-mono font-bold text-chalkboard/60 mt-1">Volunteer Logistics Console for {currentUser.name}</p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                title="Available Pickups"
                value={queue.length}
                icon={<Navigation className="w-5 h-5" />}
                description="Boxes ready to be claimed"
              />
              <StatCard
                title="Active Shipments"
                value={activeDeliveries.length}
                icon={<Package className="w-5 h-5" />}
                description="Currently claimed by you"
                accent={activeDeliveries.length > 0}
              />
              <StatCard
                title="Completed Deliveries"
                value={completedDeliveries.length}
                icon={<CheckCircle className="w-5 h-5" />}
                description="Arrived safely at classrooms"
              />
            </div>

            {/* PANEL: QUEUE */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-chalkboard uppercase tracking-wider font-mono">Select and Claim Ready Shipments</h3>
                
                {queue.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {queue.map((item) => (
                      <div 
                        key={item.pledge_id} 
                        className="bg-white rounded-xl border-3 border-chalkboard p-5 flex flex-col justify-between shadow-[4px_4px_0px_#2E4A3D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#2E4A3D] transition"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.school_photo} 
                              alt={item.school_name} 
                              className="w-12 h-12 rounded-lg object-cover border-2 border-chalkboard shadow-[1px_1px_0px_#000]"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="text-[10px] text-chalkboard/50 font-mono font-bold block uppercase">Destination School</span>
                              <span className="font-bold text-slate-800 font-sans block truncate">{item.school_name}</span>
                            </div>
                          </div>

                          <div className="mt-5 border-t border-slate-200 pt-4 space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-mono">Needed Supply:</span>
                              <span className="font-bold text-slate-700">{item.need_title}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-mono">Quantity:</span>
                              <span className="font-mono font-bold text-chalkboard">{item.qty} items</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-mono">Donor:</span>
                              <span className="font-semibold text-slate-600">{item.donor_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-slate-200 pt-4">
                          <button
                            onClick={() => handleClaimPickup(item.pledge_id)}
                            className="w-full py-2.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Truck className="w-4 h-4" /> Claim Pickup Task
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white/50 border-2 border-dashed border-chalkboard/30 rounded-xl text-chalkboard/60 font-medium italic">
                    There are no ready packages waiting in the queue right now. Thank you for checking!
                  </div>
                )}
              </div>
            )}

            {/* PANEL: ACTIVE DELIVERIES */}
            {activeTab === 'active' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-chalkboard uppercase tracking-wider font-mono">My Claimed Shipments En Route</h3>
                
                {activeDeliveries.length > 0 ? (
                  <div className="space-y-4">
                    {activeDeliveries.map((item) => (
                      <div 
                        key={item.delivery_id} 
                        className="bg-white rounded-xl border-3 border-chalkboard p-5 sm:p-6 shadow-[4px_4px_0px_#2E4A3D] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                      >
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.school_photo} 
                              alt={item.school_name} 
                              className="w-12 h-12 rounded-lg object-cover border-2 border-chalkboard shadow-[1px_1px_0px_#000]"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="text-[10px] text-chalkboard/50 font-mono font-bold block uppercase">Deliver to School</span>
                              <span className="font-bold text-slate-800 font-sans block">{item.school_name}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block font-mono">Shipment Details</span>
                              <div className="text-xs text-slate-600">
                                <span className="font-bold">{item.qty}x</span> {item.need_title}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block font-mono">Donor Pickup Info</span>
                              <div className="text-xs text-slate-600 space-y-1">
                                <div className="font-bold flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.donor_name}</div>
                                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500"><Phone className="w-3 h-3 text-slate-400" /> {item.donor_contact}</div>
                                <div className="text-[11px] text-slate-500">{item.pickup_address || 'Address not provided'}</div>
                                <button onClick={() => openMap(item.donor_latitude, item.donor_longitude, item.pickup_address)} className="text-[10px] font-bold underline cursor-pointer">Open pickup map</button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block font-mono">School Drop-off</span>
                              <div className="text-xs text-slate-600">{item.delivery_address || 'Address not provided'}</div>
                              <button onClick={() => openMap(item.school_latitude, item.school_longitude, item.delivery_address)} className="text-[10px] font-bold underline cursor-pointer">Open school map</button>
                            </div>
                          </div>
                        </div>

                        {/* Actions based on state */}
                        <div className="sm:text-right shrink-0 flex flex-col justify-center gap-3 border-t sm:border-t-0 border-slate-200 pt-4 sm:pt-0">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-mono mb-1">State</span>
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-black font-mono uppercase ${
                              item.delivery_status === 'collected' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {item.delivery_status === 'collected' ? 'Collected' : 'Claimed'}
                            </span>
                          </div>

                          {item.delivery_status === 'claimed' ? (
                            <button
                              onClick={() => handleCollectPackage(item.pledge_id)}
                              className="px-4 py-2.5 bg-pencil hover:bg-pencil-hover text-chalkboard border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition flex items-center gap-1.5 justify-center cursor-pointer"
                            >
                              <Package className="w-4 h-4" /> Mark Collected
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeliverPackage(item.pledge_id)}
                              className="px-4 py-2.5 bg-chalkboard hover:bg-chalkboard-hover text-paper border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] transition flex items-center gap-1.5 justify-center cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4 text-pencil" /> Mark Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white/50 border-2 border-dashed border-chalkboard/30 rounded-xl text-chalkboard/60 font-medium italic">
                    You don't have any active deliveries claimed. Select a ready package in the "Pickup Queue" to get started!
                  </div>
                )}
              </div>
            )}

            {/* PANEL: COMPLETED HISTORY */}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                <DataTable<any>
                  columns={[
                    {
                      header: 'Delivery ID',
                      key: 'delivery_id',
                      sortable: true,
                      render: (row) => <span className="font-mono font-bold text-xs text-slate-500">#DLV-{row.delivery_id}</span>
                    },
                    {
                      header: 'Recipient School',
                      key: 'school_name',
                      sortable: true,
                      render: (row) => <span className="font-semibold text-slate-800">{row.school_name}</span>
                    },
                    {
                      header: 'Supply Item Delivered',
                      key: 'need_title',
                      sortable: true,
                      render: (row) => (
                        <div>
                          <span className="font-medium text-slate-800 block">{row.need_title}</span>
                          <span className="font-mono text-xs text-slate-400">Qty: {row.qty}</span>
                        </div>
                      )
                    },
                    { header: 'Donor Name', key: 'donor_name', sortable: true },
                    {
                      header: 'Delivered Date',
                      key: 'delivered_at',
                      sortable: true,
                      render: (row) => (
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(row.delivered_at).toLocaleDateString()}
                        </span>
                      )
                    },
                    {
                      header: 'Status',
                      key: 'status',
                      render: () => <span className="inline-flex px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">Delivered</span>
                    }
                  ]}
                  data={completedDeliveries}
                  searchPlaceholder="Search by school..."
                  searchKey="school_name"
                  emptyMessage="You haven't completed any deliveries yet."
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
