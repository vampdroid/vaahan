import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import Vehicle3DModel from '../components/Vehicle3DModel';
import { formatDate, formatDistance } from '../services/utils';

export function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [reminders, setReminders] = useState([]);

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
    today.setHours(0, 0, 0, 0);
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
          desc: `Valid till ${formatDate(v.puc_expiry_date)}`,
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
          desc: `Valid till ${formatDate(v.insurance_expiry_date)}`,
          status: 'success',
          date: v.insurance_expiry_date
        });
      }
    }

    // General Service Reminder
    const svcType = v.service_reminder_type || 'none';
    if (svcType !== 'none') {
      const isOdo = svcType === 'odometer' || svcType === 'both';
      const isDate = svcType === 'date' || svcType === 'both';
      let status = 'neutral';
      let desc = '';

      if (isOdo && v.service_due_odometer) {
        const remainingKm = v.service_due_odometer - v.current_odometer;
        if (remainingKm <= 0) {
          status = 'danger';
          desc = `Overdue by ${formatDistance(Math.abs(remainingKm))}`;
        } else if (remainingKm <= 500) {
          status = 'warning';
          desc = `Due in ${formatDistance(remainingKm)}`;
        } else {
          desc = `Due at ${formatDistance(v.service_due_odometer)}`;
        }
      }

      if (isDate && v.service_due_date && status !== 'danger') {
        const diff = new Date(v.service_due_date) - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) {
          status = 'danger';
          desc = 'Service is overdue!';
        } else if (days <= 15) {
          status = 'warning';
          desc = `Service due in ${days} days`;
        } else if (!desc) {
          desc = `Due on ${formatDate(v.service_due_date)}`;
        }
      }

      if (v.service_due_odometer || v.service_due_date) {
        tempReminders.push({
          type: 'service',
          title: 'General Service',
          desc: desc || 'Service due soon',
          status: status,
          odo: v.service_due_odometer,
          date: v.service_due_date
        });
      }
    }

    // Engine Oil Reminder
    const oilType = v.oil_reminder_type || 'none';
    if (oilType !== 'none') {
      const isOdo = oilType === 'odometer' || oilType === 'both';
      const isDate = oilType === 'date' || oilType === 'both';
      let status = 'neutral';
      let desc = '';

      if (isOdo && v.oil_due_odometer) {
        const remainingKm = v.oil_due_odometer - v.current_odometer;
        if (remainingKm <= 0) {
          status = 'danger';
          desc = `Overdue by ${formatDistance(Math.abs(remainingKm))}`;
        } else if (remainingKm <= 300) {
          status = 'warning';
          desc = `Due in ${formatDistance(remainingKm)}`;
        } else {
          desc = `Due at ${formatDistance(v.oil_due_odometer)}`;
        }
      }

      if (isDate && v.oil_due_date && status !== 'danger') {
        const diff = new Date(v.oil_due_date) - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) {
          status = 'danger';
          desc = 'Oil change is overdue!';
        } else if (days <= 10) {
          status = 'warning';
          desc = `Oil change due in ${days} days`;
        } else if (!desc) {
          desc = `Due on ${formatDate(v.oil_due_date)}`;
        }
      }

      if (v.oil_due_odometer || v.oil_due_date) {
        tempReminders.push({
          type: 'oil',
          title: 'Engine Oil Change',
          desc: desc || 'Oil replacement due soon',
          status: status,
          odo: v.oil_due_odometer,
          date: v.oil_due_date
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
        // Extend next service odometer by 5000 km, and date by 6 months
        const nextServiceOdo = vehicle.current_odometer + 5000;
        const nextServiceDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates = { 
          service_due_odometer: nextServiceOdo,
          service_due_date: nextServiceDate
        };
        
        // Log service entry
        await supabase.from('service_logs').insert({
          vehicle_id: id,
          entry_type: 'service',
          date: today.toISOString().split('T')[0],
          odometer: vehicle.current_odometer,
          cost: 1500,
          details: ['Regular Maintenance', 'General checkup'],
          notes: 'Authorized Service Station'
        });
      } else if (type === 'oil') {
        // Extend next oil change odometer by 3000 km, and date by 3 months
        const nextOilOdo = vehicle.current_odometer + 3000;
        const nextOilDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates = { 
          oil_due_odometer: nextOilOdo,
          oil_due_date: nextOilDate
        };
        
        // Log oil entry
        await supabase.from('service_logs').insert({
          vehicle_id: id,
          entry_type: 'oil_change',
          date: today.toISOString().split('T')[0],
          odometer: vehicle.current_odometer,
          cost: 1200,
          notes: 'Engine Oil Replacement'
        });
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      fetchVehicleDetails();
    } catch (err) {
      console.error("Error marking reminder done:", err);
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
      {/* Header Panel (Light Premium/Glassmorphism Gradient) */}
      <div className="relative h-[397px] bg-gradient-to-b from-[#f2f4f8] to-[#e2e6ed] text-primary rounded-b-[2rem] shadow-[0_8px_20px_rgba(26,60,110,0.08)] z-10 w-full overflow-hidden shrink-0">
        
        {/* 3D Model Render */}
        <div className="absolute inset-0 w-full h-full opacity-100">
          <Vehicle3DModel vehicleType={vehicle.vehicle_type} color={vehicle.color} />
        </div>

        {/* TopAppBar content Overlay */}
        <div className="relative flex justify-between items-center px-container-margin h-16 w-full z-20">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-surface-container-high/40 transition-colors active:scale-95 text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Vaahan</h1>
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 -mr-2 rounded-full hover:bg-surface-container-high/40 transition-colors active:scale-95 text-primary"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>

        {/* Vehicle Info Overlay */}
        <div className="absolute bottom-12 left-0 w-full px-container-margin z-20 flex flex-col items-start gap-stack-gap-sm">
          <h2 className="font-display-lg text-display-lg text-primary select-none drop-shadow-sm font-extrabold">
            {vehicle.nickname || vehicle.model_name}
          </h2>
          
          <div className="flex items-center gap-stack-gap-md w-full">
            <div className="bg-surface/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-outline-variant/30 shadow-sm">
              <span className="font-label-lg text-label-lg tracking-widest text-primary uppercase font-bold">
                {vehicle.registration_number}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/30 ml-auto shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-primary font-bold">speed</span>
              <span className="font-label-sm text-label-sm text-primary font-extrabold">
                {formatDistance(vehicle.current_odometer || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Bottom sliding over) */}
      <div className="relative -mt-8 flex-grow bg-surface rounded-t-[2rem] z-20 px-container-margin pt-8 pb-12 flex flex-col gap-stack-gap-lg shadow-[0_-4px_24px_rgba(26,60,110,0.06)] rounded-b-xl">
        {/* Drag Handle Decoration */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-surface-container-highest rounded-full"></div>

        {/* Quick Access Bento Row */}
        <section className="flex flex-col gap-stack-gap-md">
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Quick Access</h3>
          <div className="grid grid-cols-4 gap-2">
            {/* Documents */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/documents`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(26,60,110,0.04)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">folder_open</span>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface text-center">Docs</span>
            </button>
            {/* Service Log */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/service`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(26,60,110,0.04)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">build</span>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface text-center whitespace-nowrap">Service</span>
            </button>
            {/* Oil Log */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/oil`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(26,60,110,0.04)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">oil_barrel</span>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface text-center whitespace-nowrap">Oil</span>
            </button>
            {/* Mileage */}
            <button 
              onClick={() => navigate(`/vehicles/${id}/mileage`)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(26,60,110,0.04)] hover:bg-surface-container-low active:scale-95 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">local_gas_station</span>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface text-center">Mileage</span>
            </button>
          </div>
        </section>

        {/* Upcoming Reminders Section */}
        <section className="flex flex-col gap-stack-gap-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Upcoming Reminders</h3>
          </div>
          
          <div className="flex flex-col gap-stack-gap-sm">
            {reminders.length === 0 ? (
              <div className="p-6 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl text-center shadow-ambient-lvl1 select-none">
                <span className="material-symbols-outlined text-[36px] text-outline opacity-40 mb-1">notifications_off</span>
                <span className="block font-label-lg text-label-lg text-primary font-bold">All Reminders Clear</span>
                <span className="block font-label-sm text-label-sm text-on-surface-variant mt-0.5">Configure reminders in Service or Oil settings.</span>
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
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full shrink-0">air</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Renew PUC</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Update pollution clearance status</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/documents?action=add-insurance`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full shrink-0">verified_user</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Update Insurance</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Renew or update policy expiry date</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/service?action=add`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full shrink-0">build</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Log Maintenance Service</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Log general service details &amp; checklist</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/oil?action=add`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full shrink-0">oil_barrel</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Log Oil Change</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Log engine oil &amp; filter replacement</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowLogSheet(false); navigate(`/vehicles/${id}/mileage?action=add`); }}
                className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-full shrink-0">local_gas_station</span>
                <div>
                  <span className="block font-label-lg text-label-lg font-bold">Log Fuel &amp; Mileage</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Add tank full fuel session odometer record</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleDetail;
