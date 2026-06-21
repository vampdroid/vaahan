import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { useApp } from '../context/AppContext';
import { formatDistance } from '../services/utils';

export function Reminders() {
  const navigate = useNavigate();
  const { vehicles, loadingVehicles, refreshVehicles } = useApp();
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    // Refresh vehicle list in background
    refreshVehicles();
  }, []);

  useEffect(() => {
    calculateAllReminders(vehicles);
  }, [vehicles]);

  const calculateAllReminders = (vehiclesList) => {
    const today = new Date();
    today.setHours(0,0,0,0);
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
      const svcType = v.service_reminder_type || 'none';
      if (svcType !== 'none') {
        const isOdo = svcType === 'odometer' || svcType === 'both';
        const isDate = svcType === 'date' || svcType === 'both';
        let svcOverdue = false;
        let svcSoon = false;
        let svcDetail = '';

        if (isOdo && v.service_due_odometer) {
          const remaining = v.service_due_odometer - v.current_odometer;
          if (remaining <= 0) {
            svcOverdue = true;
            svcDetail = `Overdue by ${formatDistance(Math.abs(remaining))}`;
          } else if (remaining <= 500) {
            svcSoon = true;
            svcDetail = `Due in ${formatDistance(remaining)}`;
          }
        }
        if (isDate && v.service_due_date && !svcOverdue) {
          const diff = new Date(v.service_due_date) - today;
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (days <= 0) {
            svcOverdue = true;
            svcDetail = 'Overdue!';
          } else if (days <= 15) {
            svcSoon = true;
            svcDetail = `Due in ${days} days`;
          }
        }

        if (svcOverdue) {
          list.push({
            id: `${v.id}-service`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'service',
            title: 'General Service',
            desc: svcDetail || 'Overdue!',
            status: 'danger'
          });
        } else if (svcSoon) {
          list.push({
            id: `${v.id}-service`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'service',
            title: 'General Service',
            desc: svcDetail,
            status: 'warning'
          });
        }
      }

      // Oil
      const oilType = v.oil_reminder_type || 'none';
      if (oilType !== 'none') {
        const isOdo = oilType === 'odometer' || oilType === 'both';
        const isDate = oilType === 'date' || oilType === 'both';
        let oilOverdue = false;
        let oilSoon = false;
        let oilDetail = '';

        if (isOdo && v.oil_due_odometer) {
          const remaining = v.oil_due_odometer - v.current_odometer;
          if (remaining <= 0) {
            oilOverdue = true;
            oilDetail = `Overdue by ${formatDistance(Math.abs(remaining))}`;
          } else if (remaining <= 300) {
            oilSoon = true;
            oilDetail = `Due in ${formatDistance(remaining)}`;
          }
        }
        if (isDate && v.oil_due_date && !oilOverdue) {
          const diff = new Date(v.oil_due_date) - today;
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (days <= 0) {
            oilOverdue = true;
            oilDetail = 'Overdue!';
          } else if (days <= 10) {
            oilSoon = true;
            oilDetail = `Due in ${days} days`;
          }
        }

        if (oilOverdue) {
          list.push({
            id: `${v.id}-oil`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'oil',
            title: 'Engine Oil Change',
            desc: oilDetail || 'Overdue!',
            status: 'danger'
          });
        } else if (oilSoon) {
          list.push({
            id: `${v.id}-oil`,
            vehicleId: v.id,
            vehicleName: v.nickname || v.model_name,
            regNumber: v.registration_number,
            type: 'oil',
            title: 'Engine Oil Change',
            desc: oilDetail,
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
      } else if (rem.type === 'oil') {
        const nextOil = v.current_odometer + 3000;
        updates = { oil_due_odometer: nextOil };
        await supabase.from('service_logs').insert({
          vehicle_id: rem.vehicleId,
          entry_type: 'oil',
          date: today.toISOString().split('T')[0],
          odometer: v.current_odometer,
          cost: 800,
          details: ['Engine Oil Replaced', 'Oil Filter Changed'],
          notes: 'Authorized Service Station'
        });
      }

      await supabase.from('vehicles').update(updates).eq('id', rem.vehicleId);
      await refreshVehicles();
    } catch (err) {
      console.error("Error marking reminder done:", err);
    }
  };

  const showLoading = loadingVehicles && vehicles.length === 0;

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col pb-[80px] font-body">
      <TopAppBar title="Reminders" showBack={true} />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-4 overflow-y-auto">
        {showLoading ? (
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
