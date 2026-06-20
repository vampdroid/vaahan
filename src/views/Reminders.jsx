import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { formatDistance } from '../services/utils';

export function Reminders() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('vehicles').select('*');
      if (error) throw error;
      setVehicles(data || []);
      calculateAllReminders(data || []);
    } catch (err) {
      console.error("Error fetching reminders data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAllReminders = (vehiclesList) => {
    const today = new Date();
    const list = [];

    vehiclesList.forEach(v => {
      // PUC
      if (v.puc_expiry_date) {
        const exp = new Date(v.puc_expiry_date);
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (days <= 0) {
          list.push({
            id: `${v.id}-puc`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'puc',
            title: 'PUC Renewal',
            desc: 'Expired!',
            status: 'danger'
          });
        } else if (days <= 15) {
          list.push({
            id: `${v.id}-puc`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'puc',
            title: 'PUC Renewal',
            desc: `Expires in ${days} days`,
            status: 'warning'
          });
        }
      }

      // Insurance
      if (v.insurance_expiry_date) {
        const exp = new Date(v.insurance_expiry_date);
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (days <= 0) {
          list.push({
            id: `${v.id}-ins`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'insurance',
            title: 'Insurance Renewal',
            desc: 'Expired!',
            status: 'danger'
          });
        } else if (days <= 30) {
          list.push({
            id: `${v.id}-ins`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'insurance',
            title: 'Insurance Renewal',
            desc: `Expires in ${days} days`,
            status: 'warning'
          });
        }
      }

      // Service
      if (v.service_due_odometer) {
        const remainingKm = v.service_due_odometer - v.current_odometer;
        if (remainingKm <= 0) {
          list.push({
            id: `${v.id}-service`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'service',
            title: 'Scheduled Service',
            desc: `Overdue by ${formatDistance(Math.abs(remainingKm))}`,
            status: 'danger'
          });
        } else if (remainingKm <= 500) {
          list.push({
            id: `${v.id}-service`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'service',
            title: 'Scheduled Service',
            desc: `Due in ${formatDistance(remainingKm)}`,
            status: 'warning'
          });
        }
      }
    });

    setReminders(list);
  };

  const handleDone = async (rem) => {
    try {
      const today = new Date();
      let updates = {};
      
      const v = vehicles.find(item => item.id === rem.vehicleId);
      if (!v) return;

      if (rem.type === 'puc') {
        const nextExpiry = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates = { puc_expiry_date: nextExpiry };
        await supabase.from('service_logs').insert({
          vehicle_id: rem.vehicleId,
          entry_type: 'puc',
          date: today.toISOString().split('T')[0],
          odometer: v.current_odometer,
          cost: 150,
          notes: 'Standard PUC Station'
        });
      } else if (rem.type === 'insurance') {
        const nextExpiry = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates = { insurance_expiry_date: nextExpiry };
        await supabase.from('service_logs').insert({
          vehicle_id: rem.vehicleId,
          entry_type: 'insurance',
          date: today.toISOString().split('T')[0],
          odometer: v.current_odometer,
          cost: 3500,
          notes: 'Insurance Policy Renewal'
        });
      } else if (rem.type === 'service') {
        const nextService = v.current_odometer + 5000;
        updates = { service_due_odometer: nextService };
        await supabase.from('service_logs').insert({
          vehicle_id: rem.vehicleId,
          entry_type: 'service',
          date: today.toISOString().split('T')[0],
          odometer: v.current_odometer,
          cost: 1500,
          details: ['Regular Maintenance', 'General checkup'],
          notes: 'Authorized Service Station'
        });
      }

      await supabase.from('vehicles').update(updates).eq('id', rem.vehicleId);
      fetchReminders();
    } catch (err) {
      console.error("Error marking reminder done:", err);
    }
  };

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col pb-[80px] font-body">
      <TopAppBar title="Reminders" showBack={true} />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-4 overflow-y-auto">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Checking alerts...</span>
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 mt-12 select-none">
            <span className="material-symbols-outlined text-[64px] text-pastel-teal-dark bg-pastel-teal/30 p-4 rounded-full mb-3">verified</span>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">All Clean!</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Your vehicles have no pending actions. All documents and services are up to date.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reminders.map((rem) => {
              const isDanger = rem.status === 'danger';
              const bgClass = isDanger ? 'bg-error-container border-l-4 border-error' : 'bg-warning-container border-l-4 border-warning';
              const textClass = isDanger ? 'text-error' : 'text-warning';
              
              return (
                <div 
                  key={rem.id} 
                  className={`p-4 rounded-xl flex items-center justify-between shadow-ambient-lvl1 ${bgClass}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-surface/50 p-2 rounded-full flex-shrink-0 flex items-center justify-center">
                      <span className={`material-symbols-outlined text-lg ${textClass}`}>
                        {isDanger ? 'warning' : 'priority_high'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        {rem.vehicleName} • {rem.regNumber}
                      </span>
                      <span className="font-label-lg text-label-lg text-on-surface font-bold mt-0.5">{rem.title}</span>
                      <span className={`font-body-md text-body-md font-semibold mt-0.5 ${textClass}`}>{rem.desc}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDone(rem)}
                    className="bg-surface-container-lowest text-primary font-label-sm text-label-sm px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low active:scale-95 transition-all flex items-center gap-1 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span> Done
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavBar />
    </div>
  );
}

export default Reminders;
