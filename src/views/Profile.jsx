import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { useApp } from '../context/AppContext';

export function Profile() {
  const navigate = useNavigate();
  const { profile, loadingProfile, refreshProfile } = useApp();

  // Toggle states
  const [pucAlerts, setPucAlerts] = useState(true);
  const [insAlerts, setInsAlerts] = useState(true);
  const [serviceAlerts, setServiceAlerts] = useState(true);
  const [mileageAlerts, setMileageAlerts] = useState(true);
  const [challanAlerts, setChallanAlerts] = useState(true);

  // Modal & Edit states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [isDistanceOpen, setIsDistanceOpen] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState(
    localStorage.getItem('vaahan_distance_unit') || 'km'
  );

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [dateFormat, setDateFormat] = useState(
    localStorage.getItem('vaahan_date_format') || 'DD-MM-YYYY'
  );

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setPucAlerts(profile.puc_alerts_enabled ?? true);
      setInsAlerts(profile.insurance_alerts_enabled ?? true);
      setServiceAlerts(profile.service_alerts_enabled ?? true);
      setMileageAlerts(profile.mileage_alerts_enabled ?? true);
      setChallanAlerts(profile.challan_alerts_enabled ?? true);
    }
  }, [profile]);

  const handleToggle = async (type, val, setter) => {
    setter(val);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';

      const fieldMap = {
        puc: 'puc_alerts_enabled',
        ins: 'insurance_alerts_enabled',
        service: 'service_alerts_enabled',
        mileage: 'mileage_alerts_enabled',
        challan: 'challan_alerts_enabled'
      };

      await supabase
        .from('profiles')
        .update({ [fieldMap[type]]: val })
        .eq('id', userId);
        
      await refreshProfile();
    } catch (err) {
      console.error("Error updating profile toggle:", err);
    }
  };

  const handleOpenEdit = () => {
    setEditName(profile?.full_name || '');
    setEditEmail(profile?.email || '');
    setEditPhone(profile?.phone || '');
    setIsEditOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';

      const updates = {
        full_name: editName.trim()
      };

      // Save email and phone (strictly no dummy fallback generation)
      if (editEmail.trim()) {
        updates.email = editEmail.trim();
      } else {
        updates.email = null;
      }

      if (editPhone.trim()) {
        updates.phone = editPhone.trim();
      } else {
        updates.phone = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      setIsEditOpen(false);
      await refreshProfile();
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  const handleSaveDistanceUnit = (unit) => {
    localStorage.setItem('vaahan_distance_unit', unit);
    setDistanceUnit(unit);
    setIsDistanceOpen(false);
    // Reload components depending on distance formatting
    window.location.reload();
  };

  const handleSaveDateFormat = (format) => {
    localStorage.setItem('vaahan_date_format', format);
    setDateFormat(format);
    setIsDateOpen(false);
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'YK';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const showLoading = loadingProfile && !profile;

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col pb-[80px] font-body">
      <TopAppBar 
        title="Profile" 
        showBack={true} 
      />

      {showLoading ? (
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading profile...</span>
        </div>
      ) : (
        <main className="flex-1 px-container-margin py-4 flex flex-col gap-6 overflow-y-auto">
          {/* User Card */}
          <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 shadow-ambient-lvl1 flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-lg flex items-center justify-center font-bold">
              {getInitials(profile?.full_name)}
            </div>
            
            <div className="flex flex-col">
              <h3 className="font-headline-md text-headline-md text-primary font-bold leading-tight">{profile?.full_name}</h3>
              
              <div className="flex items-center gap-1.5 text-on-surface-variant mt-1">
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span className="font-label-sm text-label-sm">{profile?.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-variant mt-0.5">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span className="font-label-sm text-label-sm">{profile?.email || 'Not provided'}</span>
              </div>
            </div>
            
            <button 
              onClick={handleOpenEdit}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </section>

          {/* Notification Preferences */}
          <section className="flex flex-col gap-3">
            <h3 className="font-headline-md text-headline-md text-primary font-bold px-1">Notification Preferences</h3>
            
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-2 shadow-ambient-lvl1">
              
              {/* PUC Toggle */}
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">eco</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">PUC Expiry</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">Alerts 7 days before expiry</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={pucAlerts}
                  onChange={(e) => handleToggle('puc', e.target.checked, setPucAlerts)}
                  className="brand-toggle"
                />
              </div>

              {/* Insurance Toggle */}
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">shield</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">Insurance Renewal</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">Alerts 15 days before expiry</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={insAlerts}
                  onChange={(e) => handleToggle('ins', e.target.checked, setInsAlerts)}
                  className="brand-toggle"
                />
              </div>

              {/* Service Toggle */}
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">build</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">Service Reminders</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">Based on time or distance</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={serviceAlerts}
                  onChange={(e) => handleToggle('service', e.target.checked, setServiceAlerts)}
                  className="brand-toggle"
                />
              </div>

              {/* Mileage Toggle */}
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">speed</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">Mileage Logs</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">Monthly fuel efficiency reports</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={mileageAlerts}
                  onChange={(e) => handleToggle('mileage', e.target.checked, setMileageAlerts)}
                  className="brand-toggle"
                />
              </div>

              {/* Challans Toggle */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">receipt_long</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">Traffic Challans</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">Immediate pending fine alerts</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={challanAlerts}
                  onChange={(e) => handleToggle('challan', e.target.checked, setChallanAlerts)}
                  className="brand-toggle"
                />
              </div>

            </div>
          </section>

          {/* App Settings */}
          <section className="flex flex-col gap-3">
            <h3 className="font-headline-md text-headline-md text-primary font-bold px-1">App Settings</h3>
            
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-2 shadow-ambient-lvl1">
              
              {/* Distance Units */}
              <div 
                onClick={() => setIsDistanceOpen(true)}
                className="flex items-center justify-between p-3 border-b border-outline-variant/20 cursor-pointer hover:bg-surface-container-low transition-colors rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">straighten</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">Distance Units</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">
                      {distanceUnit === 'mi' ? 'Miles (mi)' : 'Kilometers (km)'}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>

              {/* Date Format */}
              <div 
                onClick={() => setIsDateOpen(true)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-container-low transition-colors rounded-b-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">calendar_today</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-primary">Date Format</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80">{dateFormat}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>

            </div>
          </section>

          {/* Sign Out Button */}
          <button 
            onClick={handleSignOut}
            className="w-full bg-surface border border-error text-error font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-error-container/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </main>
      )}

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setIsEditOpen(false)}></div>
          <form 
            onSubmit={handleSaveProfile} 
            className="bg-surface text-on-surface w-full max-w-[340px] border border-outline-variant/30 rounded-2xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Edit Profile</h3>
              <button 
                type="button" 
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Full Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. yash@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 98765 43210"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center mt-2"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Distance Unit Modal */}
      {isDistanceOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setIsDistanceOpen(false)}></div>
          <div className="bg-surface text-on-surface w-full max-w-[340px] border border-outline-variant/30 rounded-2xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Distance Unit</h3>
              <button 
                type="button" 
                onClick={() => setIsDistanceOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleSaveDistanceUnit('km')}
                className={`flex items-center justify-between p-3 border rounded-xl hover:bg-surface-container-low transition-all text-left ${
                  distanceUnit === 'km' ? 'border-[#E8690B] bg-[#E8690B]/5' : 'border-outline-variant/40'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-primary">Kilometers (km)</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Used primarily in India</span>
                </div>
                {distanceUnit === 'km' && <span className="material-symbols-outlined text-[#E8690B]">check_circle</span>}
              </button>

              <button 
                onClick={() => handleSaveDistanceUnit('mi')}
                className={`flex items-center justify-between p-3 border rounded-xl hover:bg-surface-container-low transition-all text-left ${
                  distanceUnit === 'mi' ? 'border-[#E8690B] bg-[#E8690B]/5' : 'border-outline-variant/40'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-primary">Miles (mi)</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Used in US and UK regions</span>
                </div>
                {distanceUnit === 'mi' && <span className="material-symbols-outlined text-[#E8690B]">check_circle</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Format Modal */}
      {isDateOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setIsDateOpen(false)}></div>
          <div className="bg-surface text-on-surface w-full max-w-[340px] border border-outline-variant/30 rounded-2xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Date Format</h3>
              <button 
                type="button" 
                onClick={() => setIsDateOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {['DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'].map((format) => {
                const isSelected = dateFormat === format;
                return (
                  <button 
                    key={format}
                    onClick={() => handleSaveDateFormat(format)}
                    className={`flex items-center justify-between p-3 border rounded-xl hover:bg-surface-container-low transition-all text-left ${
                      isSelected ? 'border-[#E8690B] bg-[#E8690B]/5' : 'border-outline-variant/40'
                    }`}
                  >
                    <span className="font-label-lg text-label-lg font-bold text-primary">{format}</span>
                    {isSelected && <span className="material-symbols-outlined text-[#E8690B]">check_circle</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNavBar />
    </div>
  );
}

export default Profile;
