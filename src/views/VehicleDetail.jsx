import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import Vehicle3DModel from '../components/Vehicle3DModel';
import { useApp } from '../context/AppContext';
import { formatDistance } from '../services/utils';

export function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshVehicles } = useApp();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [reminders, setReminders] = useState([]);

  // Edit form states
  const [editNickname, setEditNickname] = useState('');
  const [editModelName, setEditModelName] = useState('');
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editEstDaily, setEditEstDaily] = useState('');
  const [editEstWeekly, setEditEstWeekly] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editType, setEditType] = useState('scooter');
  const [editError, setEditError] = useState('');
  const [updating, setUpdating] = useState(false);

  const colorsList = [
    { name: 'Navy', hex: '#1a3c6e' },
    { name: 'Indigo', hex: '#4546d8' },
    { name: 'Orange', hex: '#E8690B' },
    { name: 'Teal', hex: '#00695C' },
    { name: 'Red', hex: '#ba1a1a' },
    { name: 'Black', hex: '#1b1b24' }
  ];

  useEffect(() => {
    fetchVehicleDetails();
  }, [id]);

  const fetchVehicleDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id);

      if (error) throw error;
      if (data && data.length > 0) {
        const v = data[0];
        setVehicle(v);
        calculateReminders(v);
        
        // Populate edit form defaults
        setEditNickname(v.nickname || '');
        setEditModelName(v.model_name || '');
        setEditRegNumber(v.registration_number || '');
        setEditEstDaily(v.est_daily_km?.toString() || '0');
        setEditEstWeekly(v.est_weekly_km?.toString() || '0');
        setEditColor(v.color || '#1a3c6e');
        setEditType(v.vehicle_type || 'scooter');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Error fetching vehicle detail:", err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateReminders = (v) => {
    const today = new Date();
    const tempReminders = [];

    // PUC Reminder
    if (v.puc_expiry_date) {
      const expDate = new Date(v.puc_expiry_date);
      const diff = expDate - today;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (days <= 0) {
        tempReminders.push({
          type: 'puc',
          title: 'PUC Renewal',
          desc: 'Expired!',
          status: 'danger',
          date: v.puc_expiry_date
        });
      } else if (days <= 15) {
        tempReminders.push({
          type: 'puc',
          title: 'PUC Renewal',
          desc: `Expires in ${days} days`,
          status: 'warning',
          date: v.puc_expiry_date
        });
      } else {
        tempReminders.push({
          type: 'puc',
          title: 'PUC Renewal',
          desc: `Valid till ${new Date(v.puc_expiry_date).toLocaleDateString('en-GB').replace(/\//g, '-')}`,
          status: 'success',
          date: v.puc_expiry_date
        });
      }
    }

    // Insurance Reminder
    if (v.insurance_expiry_date) {
      const expDate = new Date(v.insurance_expiry_date);
      const diff = expDate - today;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (days <= 0) {
        tempReminders.push({
          type: 'insurance',
          title: 'Insurance Expiry',
          desc: 'Expired!',
          status: 'danger',
          date: v.insurance_expiry_date
        });
      } else if (days <= 30) {
        tempReminders.push({
          type: 'insurance',
          title: 'Insurance Expiry',
          desc: `Expires in ${days} days`,
          status: 'warning',
          date: v.insurance_expiry_date
        });
      } else {
        tempReminders.push({
          type: 'insurance',
          title: 'Insurance Policy',
          desc: `Valid till ${new Date(v.insurance_expiry_date).toLocaleDateString('en-GB').replace(/\//g, '-')}`,
          status: 'success',
          date: v.insurance_expiry_date
        });
      }
    }

    // Service Reminder
    if (v.service_due_odometer) {
      const remainingKm = v.service_due_odometer - v.current_odometer;
      if (remainingKm <= 0) {
        tempReminders.push({
          type: 'service',
          title: 'Scheduled Service',
          desc: `Overdue by ${Math.abs(remainingKm)} km`,
          status: 'danger',
          odo: v.service_due_odometer
        });
      } else if (remainingKm <= 500) {
        tempReminders.push({
          type: 'service',
          title: 'Scheduled Service',
          desc: `Due in ${remainingKm} km`,
          status: 'warning',
          odo: v.service_due_odometer
        });
      } else {
        tempReminders.push({
          type: 'service',
          title: 'Scheduled Service',
          desc: `Due at ${v.service_due_odometer.toLocaleString()} km`,
          status: 'neutral',
          odo: v.service_due_odometer
        });
      }
    }

    setReminders(tempReminders);
  };

  const markReminderDone = async (type) => {
    try {
      const today = new Date();
      let updates = {};
      
      if (type === 'puc') {
        const nextExpiry = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates = { puc_expiry_date: nextExpiry };
        
        await supabase.from('service_logs').insert({
          vehicle_id: id,
          entry_type: 'puc',
          date: today.toISOString().split('T')[0],
          odometer: vehicle.current_odometer,
          cost: 150,
          notes: 'Standard PUC Station'
        });
      } else if (type === 'insurance') {
        const nextExpiry = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates = { insurance_expiry_date: nextExpiry };
        
        await supabase.from('service_logs').insert({
          vehicle_id: id,
          entry_type: 'insurance',
          date: today.toISOString().split('T')[0],
          odometer: vehicle.current_odometer,
          cost: 3500,
          notes: 'Insurance Policy Renewal'
        });
      } else if (type === 'service') {
        const nextService = vehicle.current_odometer + 5000;
        updates = { service_due_odometer: nextService };
        
        await supabase.from('service_logs').insert({
          vehicle_id: id,
          entry_type: 'service',
          date: today.toISOString().split('T')[0],
          odometer: vehicle.current_odometer,
          cost: 1500,
          details: ['Regular Maintenance', 'General checkup'],
          notes: 'Authorized Service Station'
        });
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await refreshVehicles();
      fetchVehicleDetails();
    } catch (err) {
      console.error("Error marking reminder done:", err);
    }
  };

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    if (!editModelName.trim()) {
      setEditError("Please enter a model name.");
      return;
    }
    setEditError('');
    setUpdating(true);
    try {
      const updates = {
        nickname: editNickname.trim() || editModelName.trim(),
        model_name: editModelName.trim(),
        registration_number: editRegNumber.trim().toUpperCase(),
        est_daily_km: parseFloat(editEstDaily) || 0,
        est_weekly_km: parseFloat(editEstWeekly) || 0,
        color: editColor,
        vehicle_type: editType
      };

      const { error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await refreshVehicles();
      setShowEditModal(false);
      fetchVehicleDetails();
    } catch (err) {
      console.error("Error editing vehicle details:", err);
      setEditError("Could not update vehicle. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteVehicle = async () => {
    const doubleCheck = window.confirm(
      "Are you sure you want to delete this vehicle? This will permanently remove it from your garage along with all its documents and logs."
    );
    if (!doubleCheck) return;

    try {
      await supabase.from('document_vault').delete().eq('vehicle_id', id);
      await supabase.from('service_logs').delete().eq('vehicle_id', id);
      await supabase.from('mileage_logs').delete().eq('vehicle_id', id);
      await supabase.from('odometer_logs').delete().eq('vehicle_id', id);

      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshVehicles();
      navigate('/dashboard');
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      alert("Could not delete vehicle. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading vehicle...</span>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background w-full max-w-[768px] mx-auto min-h-screen relative overflow-x-hidden flex flex-col shadow-xl">
      {/* Header Panel (Top 40%) */}
      <div className="relative h-[397px] bg-gradient-to-b from-[#f5f2ff] to-[#efecf9] text-on-surface rounded-b-[2rem] shadow-[0_4px_16px_rgba(26,60,110,0.08)] z-10 w-full overflow-hidden shrink-0">
        
        {/* 3D Model Render */}
        <div className="absolute inset-0 w-full h-full opacity-95">
          <Vehicle3DModel vehicleType={vehicle.vehicle_type} color={vehicle.color} />
        </div>

        {/* TopAppBar content Overlay */}
        <div className="relative flex justify-between items-center px-container-margin h-16 w-full z-20">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-surface-container-high/40 transition-colors active:scale-95 text-on-surface"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary select-none">Vaahan</h1>
          
          <div className="relative">
            <button 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 -mr-2 rounded-full hover:bg-surface-container-high/40 transition-colors active:scale-95 text-on-surface"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>

            {/* Dropdown Actions Menu */}
            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowActionsMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface text-on-surface rounded-xl shadow-lg z-40 border border-outline-variant/30 py-1.5 animate-fadeIn">
                  <button
                    onClick={() => { setShowActionsMenu(false); setShowEditModal(true); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high font-label-md text-label-md flex items-center gap-2 text-primary font-semibold"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                    Edit Details
                  </button>
                  <button
                    onClick={() => { setShowActionsMenu(false); handleDeleteVehicle(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-error-container/20 font-label-md text-label-md flex items-center gap-2 text-error font-semibold"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                    Delete Vehicle
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Vehicle Info Overlay */}
        <div className="absolute bottom-12 left-0 w-full px-container-margin z-20 flex flex-col items-start gap-stack-gap-sm">
          <h2 className="font-display-lg text-display-lg text-primary font-bold select-none">
            {vehicle.nickname || vehicle.model_name}
          </h2>
          
          <div className="flex items-center gap-stack-gap-md w-full">
            <div className="bg-surface-container-high px-4 py-1.5 rounded-full border border-outline-variant/60 shadow-sm">
              <span className="font-label-lg text-label-lg tracking-widest text-on-surface uppercase font-semibold">
                {vehicle.registration_number}
              </span>
            </div>
            <div 
              onClick={() => navigate(`/vehicles/${id}/odometer-logs`)}
              className="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest cursor-pointer px-3 py-1.5 rounded-full border border-outline-variant/60 ml-auto shadow-sm transition-all animate-pulse"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">speed</span>
              <span className="font-label-sm text-label-sm text-on-surface font-bold">
                {formatDistance(vehicle.current_odometer || 0)}
              </span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">chevron_right</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative -mt-8 flex-grow bg-surface rounded-t-[2rem] z-20 px-container-margin pt-8 pb-12 flex flex-col gap-stack-gap-lg shadow-[0_-4px_24px_rgba(26,60,110,0.1)] rounded-b-xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-surface-container-highest rounded-full"></div>

        {/* Quick Access Grid */}
        <section className="flex flex-col gap-stack-gap-md">
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Quick Access</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Documents */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/documents`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_12px_rgba(26,60,110,0.05)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors">
                <span className="material-symbols-outlined text-primary">folder_open</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface text-center">Documents</span>
            </button>
            {/* Service Log */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/service`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_12px_rgba(26,60,110,0.05)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors">
                <span className="material-symbols-outlined text-primary">build</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface text-center whitespace-nowrap">Service Log</span>
            </button>
            {/* Mileage */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/mileage`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_12px_rgba(26,60,110,0.05)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors">
                <span className="material-symbols-outlined text-primary">local_gas_station</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface text-center">Mileage</span>
            </button>
            {/* Odometer Log */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/odometer-logs`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_12px_rgba(26,60,110,0.05)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors">
                <span className="material-symbols-outlined text-primary">speed</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface text-center">Odometer Log</span>
            </button>
          </div>
        </section>

        {/* Upcoming Reminders Section */}
        <section className="flex flex-col gap-stack-gap-md">
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Upcoming Reminders</h3>
          <div className="flex flex-col gap-stack-gap-sm">
            {reminders.length === 0 ? (
              <div className="text-center py-6 px-4 bg-surface-container-low border border-outline-variant/30 rounded-xl select-none">
                <span className="font-body-md text-body-md text-on-surface-variant font-medium">
                  All systems green! No pending alerts.
                </span>
              </div>
            ) : reminders.map((rem) => {
              let bgClass = 'bg-surface-container-lowest border-l-4 border-outline';
              let textClass = 'text-on-surface-variant';
              let icon = 'info';

              if (rem.status === 'danger') {
                bgClass = 'bg-error-container border-l-4 border-error';
                textClass = 'text-error font-medium';
                icon = 'warning';
              } else if (rem.status === 'warning') {
                bgClass = 'bg-warning-container border-l-4 border-warning';
                textClass = 'text-warning font-medium';
                icon = 'priority_high';
              } else if (rem.status === 'success') {
                bgClass = 'bg-pastel-teal/20 border-l-4 border-pastel-teal-dark';
                textClass = 'text-pastel-teal-dark font-medium';
                icon = 'verified_user';
              }

              return (
                <div 
                  key={rem.type}
                  className={`${bgClass} rounded-xl p-4 flex items-center justify-between shadow-ambient-lvl1`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-surface/40 p-2 rounded-full flex-shrink-0 flex items-center justify-center">
                      <span className={`material-symbols-outlined ${rem.status === 'success' ? 'filled' : ''} text-lg`}>
                        {icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">{rem.title}</span>
                      <span className={`font-body-md text-body-md ${textClass}`}>{rem.desc}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => markReminderDone(rem.type)}
                    className="bg-surface-container-lowest text-primary font-label-sm text-label-sm px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low active:scale-95 transition-all flex items-center gap-1 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span> Done
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Primary Action Button */}
        <div className="mt-4">
          <button 
            onClick={() => setShowLogSheet(true)}
            className="w-full bg-secondary-container text-on-secondary-container font-headline-md text-headline-md py-4 rounded-[12px] shadow-[0_8px_20px_rgba(26,60,110,0.10)] hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-2 font-bold"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add Log Entry
          </button>
        </div>
      </div>

      {/* Log Entry Selector Drawer / Modal */}
      {showLogSheet && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="absolute inset-0" onClick={() => setShowLogSheet(false)}></div>
          <div 
            className="bg-surface text-on-surface rounded-t-[2rem] w-full max-w-[768px] px-container-margin pt-6 pb-8 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.15)] relative z-10 transition-transform duration-300 transform translate-y-0"
            style={{ animation: 'slideUp 0.3s ease-out forwards' }}
          >
            <div className="w-12 h-1.5 bg-surface-container-highest rounded-full self-center mb-1"></div>
            
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Select Log Entry</h3>
              <button 
                onClick={() => setShowLogSheet(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/puc-history?action=add`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full">air</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Renew PUC</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Update pollution clearance status</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/documents?action=add-insurance`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full">verified_user</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Update Insurance</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Renew or update policy expiry date</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/service?action=add`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full">build</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Log Maintenance Service</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Log garage service details &amp; checklist</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/mileage?action=add`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full">local_gas_station</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Log Fuel &amp; Mileage</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Add tank full fuel session odometer record</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/odometer-logs`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full">speed</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Log Odometer Reading</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Log odometer value and track usage</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowEditModal(false)}></div>
          <form 
            onSubmit={handleEditVehicle}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Edit Vehicle Details</h3>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Make &amp; Model</label>
                <input 
                  type="text"
                  value={editModelName}
                  onChange={(e) => setEditModelName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Nickname</label>
                <input 
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Registration Number</label>
                <input 
                  type="text"
                  value={editRegNumber}
                  onChange={(e) => setEditRegNumber(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none uppercase"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                   <button
                    type="button"
                    onClick={() => setEditType('scooter')}
                    className={`py-2.5 rounded-xl border flex items-center justify-center gap-2 font-label-md text-label-md font-bold transition-all ${
                      editType === 'scooter'
                        ? 'bg-[#131939] text-white border-[#131939] shadow-sm'
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">two_wheeler</span>
                    Two Wheeler
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('car')}
                    className={`py-2.5 rounded-xl border flex items-center justify-center gap-2 font-label-md text-label-md font-bold transition-all ${
                      editType === 'car'
                        ? 'bg-[#131939] text-white border-[#131939] shadow-sm'
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">directions_car</span>
                    Four Wheeler
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Est. Daily Usage (km)</label>
                <input 
                  type="number"
                  value={editEstDaily}
                  onChange={(e) => setEditEstDaily(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Est. Weekly Usage (km)</label>
                <input 
                  type="number"
                  value={editEstWeekly}
                  onChange={(e) => setEditEstWeekly(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Vehicle Color</span>
                <div className="flex gap-2.5 justify-center">
                  {colorsList.map((c) => {
                    const isSelected = editColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setEditColor(c.hex)}
                        className="w-8 h-8 rounded-full border shadow-sm relative transition-transform active:scale-95"
                        style={{ 
                          backgroundColor: c.hex,
                          borderColor: isSelected ? '#131939' : '#c7c5cf',
                          borderWidth: isSelected ? '3px' : '1px',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                        }}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-[16px] absolute inset-0 m-auto flex items-center justify-center">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {editError && <p className="text-error font-label-sm text-label-sm px-1">{editError}</p>}

            <button 
              type="submit"
              disabled={updating}
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default VehicleDetail;
