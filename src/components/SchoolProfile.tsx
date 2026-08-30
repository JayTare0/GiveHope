import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Gift, Share2, Clipboard, Heart, Calendar, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { School, Need, Update } from '../types';
import { Modal } from './Shared';

interface SchoolProfileProps {
  schoolId: number;
  currentUser: any;
  onBack: () => void;
  onNavigateLogin: () => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function SchoolProfile({ schoolId, currentUser, onBack, onNavigateLogin, addToast }: SchoolProfileProps) {
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [activeTab, setActiveTab] = useState<'needs' | 'updates'>('needs');

  // Pledge modal state
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);
  const [pledgeQty, setPledgeQty] = useState(1);
  const [donorName, setDonorName] = useState('');
  const [donorContact, setDonorContact] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submittingPledge, setSubmittingPledge] = useState(false);

  // Load school profile
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/schools/${schoolId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load school profile');
      }
      setSchool(data.school);
      setNeeds(data.needs);
      setUpdates(data.updates);
    } catch (err: any) {
      addToast(err.message, 'error');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [schoolId]);

  // Pre-fill donor details if logged in
  useEffect(() => {
    if (currentUser) {
      setDonorName(currentUser.name);
      setDonorContact(currentUser.email);
    } else {
      setDonorName('');
      setDonorContact('');
    }
  }, [currentUser, selectedNeed]);

  const handleOpenPledge = (need: Need) => {
    if (!currentUser || currentUser.role !== 'donor') {
      addToast('Please log in with a Donor account before pledging so you can manage pickup and delivery.', 'info');
      onNavigateLogin();
      return;
    }
    const remaining = need.qty_needed - need.qty_pledged;
    if (remaining <= 0) {
      addToast('This item is already fully pledged! Thank you.', 'info');
      return;
    }
    setSelectedNeed(need);
    setPledgeQty(1);
  };

  const handleClosePledge = () => {
    setSelectedNeed(null);
  };

  const useCurrentPickupLocation = () => {
    if (!navigator.geolocation) {
      addToast('Location is not supported by this browser.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        addToast('Pickup location added. It will only be shared with the assigned volunteer.', 'success');
      },
      () => addToast('Location permission was not granted. You can still enter an address.', 'error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitPledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNeed) return;

    if (pledgeQty <= 0) {
      addToast('Please enter a quantity greater than zero.', 'error');
      return;
    }

    const remaining = selectedNeed.qty_needed - selectedNeed.qty_pledged;
    if (pledgeQty > remaining) {
      addToast(`Pledge quantity exceeds remaining need. Only ${remaining} needed.`, 'error');
      return;
    }

    if (!donorName.trim() || !donorContact.trim() || !pickupAddress.trim()) {
      addToast('Please provide your name, contact details, and pickup address.', 'error');
      return;
    }

    setSubmittingPledge(true);
    try {
      const payload: any = {
        needId: selectedNeed.id,
        qty: pledgeQty,
        donorName: donorName.trim(),
        contact: donorContact.trim(),
        pickupAddress: pickupAddress.trim(),
        latitude: pickupLocation?.latitude,
        longitude: pickupLocation?.longitude,
      };

      if (currentUser && currentUser.role === 'donor') {
        payload.donorId = currentUser.id;
      }

      const response = await fetch(`/api/public/schools/${schoolId}/pledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record pledge');
      }

      addToast(`Thank you! You pledged ${pledgeQty} of "${selectedNeed.title}".`, 'success');
      handleClosePledge();
      fetchProfile(); // Refresh needs list
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingPledge(false);
    }
  };

  // Share Actions
  const handleCopyLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('Campaign URL copied to clipboard!', 'success');
    }).catch(() => {
      addToast('Failed to copy link.', 'error');
    });
  };

  const handleShareWhatsApp = () => {
    if (!school) return;
    const shareText = `Hi! Check out the physical supply registry for ${school.name} on Supply the Need. They need notebooks, pens, and art supplies for their students. Every item pledge makes a difference! View registry here: ${window.location.href}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-chalkboard mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-slate-500 font-medium">Loading campaign registry...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-slate-700">School Profile Not Found</h3>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
          Return to Directory
        </button>
      </div>
    );
  }

  // Aggregate stats
  const totalNeeded = needs.reduce((sum, item) => sum + item.qty_needed, 0);
  const totalPledged = needs.reduce((sum, item) => sum + item.qty_pledged, 0);
  const overallRate = totalNeeded > 0 ? Math.min(Math.round((totalPledged / totalNeeded) * 100), 100) : 0;

  return (
    <div className="bg-paper min-h-screen text-slate-800 pb-24">
      {/* Dynamic top brand bar */}
      <div className="h-2 bg-chalkboard w-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-chalkboard transition mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4.5 h-4.5 group-hover:-translate-x-0.5 transition" />
          Back to School Directory
        </button>

        {/* --- SCHOOL HERO CONTAINER --- */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 gap-0 mb-10">
          {/* Cover image (45% width on large) */}
          <div className="md:col-span-5 h-64 md:h-full relative min-h-[250px] bg-slate-150">
            <img
              src={school.photo_url}
              alt={school.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Details (55% width) */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-[10px] font-bold font-mono text-emerald-700 border border-emerald-100 uppercase">
                  <ShieldCheck className="w-3 h-3" /> Verified NGO
                </span>
              </div>
              
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-chalkboard mt-3">
                {school.name}
              </h2>
              
              <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-light">
                {school.blurb}
              </p>
            </div>

            {/* Campaign Aggregate Progress */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Platform Goal Progress</span>
                  <div className="font-mono text-2xl font-bold text-slate-800">
                    {totalPledged} <span className="text-sm font-normal text-slate-400">pledged of {totalNeeded} items</span>
                  </div>
                </div>
                <div className="font-mono text-2xl font-bold text-chalkboard">{overallRate}%</div>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                <div 
                  className="h-full bg-chalkboard rounded-full transition-all duration-500" 
                  style={{ width: `${overallRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN PAGE LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Columns (Needs & Updates) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('needs')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'needs'
                    ? 'border-chalkboard text-chalkboard'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Needs Registry ({needs.length})
              </button>
              <button
                onClick={() => setActiveTab('updates')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'updates'
                    ? 'border-chalkboard text-chalkboard'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Updates Timeline ({updates.length})
              </button>
            </div>

            {/* Tab content: Needs */}
            {activeTab === 'needs' && (
              <div className="space-y-4">
                {needs.length > 0 ? (
                  needs.map((item) => {
                    const remaining = item.qty_needed - item.qty_pledged;
                    const itemRate = Math.min(Math.round((item.qty_pledged / item.qty_needed) * 100), 100);

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase tracking-wider font-mono">
                              {item.category}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 font-mono">
                              {item.grade_info}
                            </span>
                          </div>
                          
                          <h4 className="font-sans font-bold text-slate-800 text-base truncate">{item.title}</h4>
                          
                          {/* Inner Progress Bar */}
                          <div className="mt-3 max-w-sm">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                              <span>Pledges Fulfill Rate</span>
                              <span>{item.qty_pledged} / {item.qty_needed} ({itemRate}%)</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div className="h-full bg-chalkboard rounded-full" style={{ width: `${itemRate}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Action details */}
                        <div className="sm:text-right shrink-0 flex items-center sm:flex-col justify-between sm:justify-center gap-4">
                          <div className="font-mono">
                            {remaining > 0 ? (
                              <div className="text-right">
                                <span className="block text-xs text-slate-400">Remaining</span>
                                <span className="block text-sm font-bold text-slate-700">{remaining} items</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold font-mono">
                                <Check className="w-3.5 h-3.5" /> Fully Pledged
                              </span>
                            )}
                          </div>

                          {remaining > 0 && (
                            <button
                              onClick={() => handleOpenPledge(item)}
                              className="px-4 py-2 border-2 border-chalkboard rounded-xl text-xs font-bold text-chalkboard bg-pencil hover:bg-pencil-hover shadow-[2px_2px_0px_0px_rgba(46,74,61,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(46,74,61,1)] transition cursor-pointer"
                            >
                              Pledge This
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center text-slate-400 italic">
                    This school has not published any needed school supplies yet.
                  </div>
                )}
              </div>
            )}

            {/* Tab content: Updates */}
            {activeTab === 'updates' && (
              <div className="space-y-6">
                {updates.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 py-2">
                    {updates.map((update, idx) => (
                      <div key={update.id} className="relative">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[33px] top-1.5 p-1 bg-white border-2 border-chalkboard rounded-full text-chalkboard">
                          <Calendar className="w-3 h-3" />
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(update.created_at).toLocaleDateString(undefined, { 
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
                            {update.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center text-slate-400 italic">
                    This school hasn't published any updates or campaigns logs yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (Sidebar Actions / Sharing / Rules) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Share Widget */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs">
              <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-4">
                <Share2 className="w-4 h-4 text-chalkboard" /> Help Share Registry
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Word of mouth is how school campaign drives succeed! Copy this registry's link or share it directly to WhatsApp.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
                >
                  <Clipboard className="w-4 h-4" /> Copy Campaign Link
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-emerald-600" /> Share on WhatsApp
                </button>
              </div>
            </div>

            {/* Campaign Guide Card */}
            <div className="bg-chalkboard text-white p-6 rounded-2xl border border-chalkboard shadow-xs">
              <h3 className="font-sans font-bold text-sm text-pencil flex items-center gap-1.5 mb-3">
                <Heart className="w-4.5 h-4.5 fill-pencil text-pencil" /> How Pledging Works
              </h3>
              <ol className="text-xs text-slate-200 space-y-3 list-decimal list-inside leading-relaxed">
                <li>Choose needed items and declare how many you will provide.</li>
                <li>Go to your dashboard to mark them <span className="font-bold text-pencil">"Ready for pickup"</span> when set aside.</li>
                <li>A verified delivery volunteer claims the pickup and collects it from your address.</li>
                <li>Items are delivered directly to the school. Receipts are recorded with full timestamps!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* --- PLEDGE DIALOG MODAL --- */}
      <Modal
        isOpen={selectedNeed !== null}
        onClose={handleClosePledge}
        title={`Pledge School Supply`}
      >
        {selectedNeed && (
          <form onSubmit={submitPledge} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">Needed Supply Item</span>
              <span className="block font-sans font-bold text-slate-800 text-sm mt-0.5">{selectedNeed.title}</span>
              <span className="block text-[10px] font-mono text-slate-500 mt-1 uppercase bg-slate-200 px-1.5 py-0.5 rounded w-fit">
                {selectedNeed.category} • {selectedNeed.grade_info}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                  Remaining Need
                </label>
                <div className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono text-xs font-bold">
                  {selectedNeed.qty_needed - selectedNeed.qty_pledged} items
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                  Your Pledge Qty *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedNeed.qty_needed - selectedNeed.qty_pledged}
                  value={pledgeQty}
                  onChange={(e) => setPledgeQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                Your Contact Name *
              </label>
              <input
                type="text"
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                Contact Phone or Email *
              </label>
              <input
                type="text"
                required
                value={donorContact}
                onChange={(e) => setDonorContact(e.target.value)}
                placeholder="How our logistics volunteer can contact you"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition text-sm"
              />
              <span className="block text-[9px] text-slate-400 mt-1">
                Your contact info is only shared with verified delivery volunteers and school management.
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                Pickup Address *
              </label>
              <textarea
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="House/building, street, area, city"
                rows={2}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-chalkboard/40 transition text-sm resize-none"
              />
              <button type="button" onClick={useCurrentPickupLocation} className="mt-2 text-[10px] font-bold text-chalkboard underline cursor-pointer">
                {pickupLocation ? '✓ Current location attached' : 'Use my current location'}
              </button>
              <span className="block text-[9px] text-slate-400 mt-1">Only the volunteer assigned to this pickup can see this location.</span>
            </div>

            {/* Note reinforcing physical nature */}
            <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl flex gap-2">
              <Gift className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
              <p className="text-[10px] text-amber-800 leading-normal">
                <span className="font-bold">Important:</span> This is a physical commitment. You are pledging to purchase and prepare <span className="font-bold font-mono">{pledgeQty}x</span> of these items. No money transfers will happen.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleClosePledge}
                className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPledge}
                className="flex-1 py-2.5 border-2 border-chalkboard rounded-xl text-xs font-bold text-chalkboard bg-pencil hover:bg-pencil-hover shadow-[2px_2px_0px_0px_rgba(46,74,61,1)] transition cursor-pointer"
              >
                {submittingPledge ? 'Submitting...' : 'Confirm Pledge'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
