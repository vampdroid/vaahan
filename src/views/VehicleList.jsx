import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { formatDate, formatDistance, getDistanceUnit } from '../services/utils';

export function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Odometer Modal State
  const [showOdoModal, setShowOdoModal] = useState(false);
  const [selectedVehicleForOdo, setSelectedVehicleForOdo] = useState(null);
  const [newOdoValue, setNewOdoValue] = useState('');
  const [odoError, setOdoError] = useState('');
  const [odoLoading, setOdoLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error("Error fetching vehicles list:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadges = (v) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // PUC
    let pucStatus = "Active";
    if (v.puc_expiry_date) {
      const diff = new Date(v.puc_expiry_date) - today;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days <= 0) pucStatus = "Expired";
      else if (days <= 10) pucStatus = `${days}d left`;
    } else {
      pucStatus = "PUC: N/A";
    }

    // Insurance
    let insStatus = "Active";
    if (v.insurance_expiry_date) {
      const diff = new Date(v.insurance_expiry_date) - today;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days <= 0) insStatus = "Expired";
      else if (days <= 30) insStatus = `${days}d left`;
    } else {
      insStatus = "Ins: N/A";
    }

    // General Service
    let svcStatus = "Good";
    const svcType = v.service_reminder_type || 'none';
    if (svcType === 'none') {
      svcStatus = "Svc: N/A";
    } else {
      const isOdo = svcType === 'odometer' || svcType === 'both';
      const isDate = svcType === 'date' || svcType === 'both';

      if (isOdo && v.service_due_odometer) {
        if (v.current_odometer >= v.service_due_odometer) svcStatus = "Overdue";
        else if (v.service_due_odometer - v.current_odometer <= 500) svcStatus = "Due soon";
      }
      if (isDate && v.service_due_date && svcStatus !== "Overdue") {
        const diff = new Date(v.service_due_date) - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) svcStatus = "Overdue";
        else if (days <= 15) svcStatus = "Due soon";
      }
    }

    // Oil Change
    let oilStatus = "Good";
    const oilType = v.oil_reminder_type || 'none';
    if (oilType === 'none') {
      oilStatus = "Oil: N/A";
    } else {
      const isOdo = oilType === 'odometer' || oilType === 'both';
      const isDate = oilType === 'date' || oilType === 'both';

      if (isOdo && v.oil_due_odometer) {
        if (v.current_odometer >= v.oil_due_odometer) oilStatus = "Overdue";
        else if (v.oil_due_odometer - v.current_odometer <= 300) oilStatus = "Due soon";
      }
      if (isDate && v.oil_due_date && oilStatus !== "Overdue") {
        const diff = new Date(v.oil_due_date) - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) oilStatus = "Overdue";
        else if (days <= 10) oilStatus = "Due soon";
      }
    }

    // Normalize label text prefixes if they don't have them
    const pLabel = pucStatus.startsWith("PUC:") ? pucStatus : `PUC: ${pucStatus}`;
    const iLabel = insStatus.startsWith("Ins:") ? insStatus : `Ins: ${insStatus}`;
    const sLabel = svcStatus.startsWith("Svc:") ? svcStatus : `Svc: ${svcStatus}`;
    const oLabel = oilStatus.startsWith("Oil:") ? oilStatus : `Oil: ${oilStatus}`;

    return { pucStatus: pLabel, insStatus: iLabel, svcStatus: sLabel, oilStatus: oLabel };
  };

  const handleOpenOdometerModal = (e, vehicle) => {
    e.stopPropagation();
    setSelectedVehicleForOdo(vehicle);
    
    const unit = getDistanceUnit();
    const currentOdoInUnit = unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer;
    setNewOdoValue(currentOdoInUnit ? currentOdoInUnit.toString() : '');
    setOdoError('');
    setShowOdoModal(true);
  };

  const handleUpdateOdometerSubmit = async (e) => {
    e.preventDefault();
    if (!newOdoValue || parseFloat(newOdoValue) < 0) {
      setOdoError("Please enter a valid odometer reading.");
      return;
    }
    const odoNum = parseFloat(newOdoValue);
    const unit = getDistanceUnit();
    const currentOdoInUnit = unit === 'mi' ? Math.round(selectedVehicleForOdo.current_odometer / 1.60934) : selectedVehicleForOdo.current_odometer;

    if (odoNum < currentOdoInUnit) {
      setOdoError(`New odometer reading cannot be less than current (${currentOdoInUnit.toLocaleString()} ${unit}).`);
      return;
    }

    setOdoLoading(true);
    setOdoError('');
    try {
      const normalizedOdo = unit === 'mi' ? Math.round(odoNum * 1.60934) : odoNum;
      const { error } = await supabase
        .from('vehicles')
        .update({ current_odometer: normalizedOdo })
        .eq('id', selectedVehicleForOdo.id);

      if (error) throw error;
      setShowOdoModal(false);
      fetchVehicles();
    } catch (err) {
      console.error("Error updating odometer:", err);
      setOdoError(err.message || "Failed to update odometer.");
    } finally {
      setOdoLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col pb-[80px] font-body">
      <TopAppBar 
        title="Your Garage" 
        showBack={true}
        rightElement={
          <button 
            onClick={() => navigate('/vehicles/add/step1')}
            className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        }
      />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading garage...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 mt-12">
            <span className="material-symbols-outlined text-[64px] text-outline opacity-40 mb-3">directions_car</span>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">No Vehicles Found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">
              You haven't registered any vehicles yet. Let's add your first one to get started.
            </p>
            <button 
              onClick={() => navigate('/vehicles/add/step1')}
              className="bg-primary text-on-primary font-label-lg text-label-lg font-bold px-6 py-3 rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md"
            >
              Add Vehicle
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {vehicles.map((v) => {
              const isScooter = v.vehicle_type === 'scooter' || v.vehicle_type === 'bike';
              const { pucStatus, insStatus, svcStatus, oilStatus } = getStatusBadges(v);

              const getBadgeColor = (status) => {
                if (status.includes("N/A")) {
                  return "bg-surface-container-high text-on-surface-variant/80 border border-outline-variant/30";
                }
                if (status.includes("Expired") || status.includes("Overdue")) {
                  return "bg-error-container text-error";
                }
                if (status.includes("d") || status.includes("soon")) {
                  return "bg-warning-container text-warning";
                }
                return "bg-pastel-teal/20 text-pastel-teal-dark font-semibold";
              };

              return (
                <div 
                  key={v.id}
                  onClick={() => navigate(`/vehicles/${v.id}`)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-3 shadow-ambient-lvl1 hover:bg-surface-container-low active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Left Avatar */}
                    <div className="bg-primary-fixed text-primary w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-2xl">
                        {isScooter ? 'two_wheeler' : 'directions_car'}
                      </span>
                    </div>
                    
                    {/* Right Info wrapped flex */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                        <h4 className="font-headline-md text-headline-md text-primary font-bold leading-tight break-words">
                          {v.nickname || v.model_name}
                        </h4>
                        
                        <div className="flex-shrink-0">
                          <button 
                            onClick={(e) => handleOpenOdometerModal(e, v)}
                            className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/30 px-3 py-1 rounded-full hover:bg-surface-container-medium hover:border-secondary/40 active:scale-95 transition-all text-on-surface select-none shadow-sm group"
                          >
                            <span className="material-symbols-outlined text-[15px] text-outline group-hover:text-secondary transition-colors">speed</span>
                            <span className="font-label-sm text-label-sm text-on-surface font-bold whitespace-nowrap">
                              {formatDistance(v.current_odometer || 0)}
                            </span>
                            <span className="material-symbols-outlined text-[12px] text-secondary">edit</span>
                          </button>
                        </div>
                      </div>
                      
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        {v.registration_number}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges Inline */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-outline-variant/20">
                    <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(pucStatus)}`}>
                      {pucStatus}
                    </span>
                    <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(insStatus)}`}>
                      {insStatus}
                    </span>
                    <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(svcStatus)}`}>
                      {svcStatus}
                    </span>
                    <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(oilStatus)}`}>
                      {oilStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Update Odometer Quick Action Modal */}
      {showOdoModal && selectedVehicleForOdo && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowOdoModal(false)}></div>
          <form 
            onSubmit={handleUpdateOdometerSubmit}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 animate-scale-up"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Update Odometer</h3>
              <button 
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                New Odometer reading for {selectedVehicleForOdo.nickname || selectedVehicleForOdo.model_name} ({getDistanceUnit()})
              </label>
              <input 
                type="number"
                value={newOdoValue}
                onChange={(e) => setNewOdoValue(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 font-body-lg text-body-lg text-on-surface outline-none focus:border-primary"
                required
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                Current Odometer: {formatDistance(selectedVehicleForOdo.current_odometer)}
              </span>
            </div>

            {odoError && <p className="text-error font-label-sm text-label-sm">{odoError}</p>}

            <button
              type="submit"
              disabled={odoLoading}
              className="w-full bg-[#E8690B] hover:bg-secondary text-white font-label-lg text-label-lg font-bold py-3 rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 disabled:opacity-50"
            >
              {odoLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Update Odometer
            </button>
          </form>
        </div>
      )}

      <BottomNavBar />
    </div>
  );
}

export default VehicleList;
