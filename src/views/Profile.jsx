import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Toggle states
  const [pucAlerts, setPucAlerts] = useState(true);
  const [insAlerts, setInsAlerts] = useState(true);
  const [serviceAlerts, setServiceAlerts] = useState(true);
  const [mileageAlerts, setMileageAlerts] = useState(true);
  const [challanAlerts, setChallanAlerts] = useState(true);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [isDistanceOpen, setIsDistanceOpen] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState(localStorage.getItem('vaahan_distance_unit') || 'km');

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [dateFormat, setDateFormat] = useState(localStorage.getItem('vaahan_date_format') || 'DD-MM-YYYY');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (error) throw error;
      if (data && data.length > 0) {
        const p = data[0];
        setProfile(p);
        setPucAlerts(p.puc_alerts_enabled ?? true);
        setInsAlerts(p.insurance_alerts_enabled ?? true);
        setServiceAlerts(p.service_alerts_enabled ?? true);
        setMileageAlerts(p.mileage_alerts_enabled ?? true);
        setChallanAlerts(p.challan_alerts_enabled ?? true);
        
        if (p.distance_unit) {
          localStorage.setItem('vaahan_distance_unit', p.distance_unit);
          setDistanceUnit(p.distance_unit);
        }
        if (p.date_format) {
          localStorage.setItem('vaahan_date_format', p.date_format);
          setDateFormat(p.date_format);
        }
      } else {
        // Fallback mock profile
        const mockP = {
          full_name: session?.user?.user_metadata?.full_name || 'Yash Kukreja',
          email: session?.user?.email || 'yash.k@example.com',
          phone: session?.user?.phone || '+91 98765 43210'
        };
        setProfile(mockP);
      }
    } catch (err) {
      console.error("Error fetching profile details:", err);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
      console.error("Error updating profile toggle:", err);
    }
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

  const openEditModal = () => {
    setEditName(profile?.full_name || '');
    setEditEmail(profile?.email || '');
    setEditPhone(profile?.phone || '');
    setIsEditOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Name is required");
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';

      const updatedFields = {
        full_name: editName,
        email: editEmail,
        phone: editPhone
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatedFields)
        .eq('id', userId);

      // If it fails because profile row doesn't exist, we insert it
      if (error) {
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({ id: userId, ...updatedFields });
        if (insertErr) throw insertErr;
      }

      setProfile(prev => ({
        ...prev,
        ...updatedFields
      }));
      setIsEditOpen(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      // Fallback update in state if DB table does not accept edits
      setProfile(prev => ({
        ...prev,
        full_name: editName,
        email: editEmail,
        phone: editPhone
      }));
      setIsEditOpen(false);
    }
  };

  const handleSaveDistanceUnit = async (unit) => {
    setDistanceUnit(unit);
    localStorage.setItem('vaahan_distance_unit', unit);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';
      await supabase
        .from('profiles')
        .update({ distance_unit: unit })
        .eq('id', userId);
    } catch (err) {
      console.warn("Could not save distance unit to Supabase profiles:", err);
    }
    setIsDistanceOpen(false);
  };

  const handleSaveDateFormat = async (format) => {
    setDateFormat(format);
    localStorage.setItem('vaahan_date_format', format);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';
      await supabase
        .from('profiles')
        .update({ date_format: format })
        .eq('id', userId);
    } catch (err) {
      console.warn("Could not save date format to Supabase profiles:", err);
    }
    setIsDateOpen(false);
  };

  if (loading || !profile) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col pb-[80px] font-body">
      <TopAppBar 
        title="Profile" 
        showBack={true} 
      />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-6 overflow-y-auto">
        {/* User Card */}
        <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 shadow-ambient-lvl1 flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-lg flex items-center justify-center font-bold">
            {getInitials(profile.full_name)}
          </div>
          
          <div className="flex flex-col">
            <h3 className="font-headline-md text-headline-md text-primary font-bold leading-tight">{profile.full_name}</h3>
            
            <div className="flex items-center gap-1.5 text-on-surface-variant mt-1">
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span className="font-label-sm text-label-sm">{profile.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant mt-0.5">
              <span className="material-symbols-outlined text-[16px]">mail</span>
              <span className="font-label-sm text-label-sm">{profile.email || 'Not provided'}</span>
            </div>
          </div>
          
          <button 
            onClick={openEditModal}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant"
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
            
            {/* Distance Units Row */}
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

            {/* Date Format Row */}
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

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-[400px] border border-outline-variant/30 rounded-3xl p-6 shadow-ambient-lvl3 animate-scale-up text-on-surface font-body">
            <h3 className="font-headline-md text-headline-md text-primary font-bold mb-4">Edit Profile</h3>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Full Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-body text-body-medium focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-body text-body-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Phone Number</label>
                <input 
                  type="text" 
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-body text-body-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/60 font-label-lg text-label-lg font-bold hover:bg-surface-container-high transition-colors text-on-surface-variant"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary-hover transition-colors shadow-ambient-lvl1"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distance Unit Modal */}
      {isDistanceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-[360px] border border-outline-variant/30 rounded-3xl p-6 shadow-ambient-lvl3 animate-scale-up text-on-surface font-body">
            <h3 className="font-headline-md text-headline-md text-primary font-bold mb-4">Distance Unit</h3>
            <div className="flex flex-col gap-3">
              <label 
                className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-xl cursor-pointer hover:bg-surface-container-low transition-all"
                onClick={() => handleSaveDistanceUnit('km')}
              >
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-primary">Kilometers (km)</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Default unit in India</span>
                </div>
                <input 
                  type="radio" 
                  name="distance_unit" 
                  checked={distanceUnit === 'km'} 
                  readOnly 
                  className="brand-toggle"
                />
              </label>

              <label 
                className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-xl cursor-pointer hover:bg-surface-container-low transition-all"
                onClick={() => handleSaveDistanceUnit('mi')}
              >
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-primary">Miles (mi)</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Used in US/UK regions</span>
                </div>
                <input 
                  type="radio" 
                  name="distance_unit" 
                  checked={distanceUnit === 'mi'} 
                  readOnly 
                  className="brand-toggle"
                />
              </label>
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                type="button" 
                onClick={() => setIsDistanceOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant/60 font-label-lg text-label-lg font-bold hover:bg-surface-container-high transition-colors text-on-surface-variant"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Format Modal */}
      {isDateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-[360px] border border-outline-variant/30 rounded-3xl p-6 shadow-ambient-lvl3 animate-scale-up text-on-surface font-body">
            <h3 className="font-headline-md text-headline-md text-primary font-bold mb-4">Date Format</h3>
            <div className="flex flex-col gap-3">
              {['DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'].map((format) => (
                <label 
                  key={format}
                  className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-xl cursor-pointer hover:bg-surface-container-low transition-all"
                  onClick={() => handleSaveDateFormat(format)}
                >
                  <span className="font-label-lg text-label-lg font-bold text-primary">{format}</span>
                  <input 
                    type="radio" 
                    name="date_format" 
                    checked={dateFormat === format} 
                    readOnly 
                    className="brand-toggle"
                  />
                </label>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                type="button" 
                onClick={() => setIsDateOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant/60 font-label-lg text-label-lg font-bold hover:bg-surface-container-high transition-colors text-on-surface-variant"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavBar />
    </div>
  );
}

export default Profile;
