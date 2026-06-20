import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { formatDate, formatDistance, getDistanceUnit } from '../services/utils';

export function Dashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [alerts, setAlerts] = useState([]);

  // Modal States
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(''); // 'puc' | 'insurance' | 'service' | 'oil'

  const [showOdoModal, setShowOdoModal] = useState(false);
  const [selectedVehicleForOdo, setSelectedVehicleForOdo] = useState(null);
  const [newOdoValue, setNewOdoValue] = useState('');
  const [odoError, setOdoError] = useState('');
  const [odoLoading, setOdoLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch session user
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserName(session.user.user_metadata.full_name?.split(' ')[0] || 'User');
      }

      // Fetch vehicles
      const { data: vehiclesData, error: vError } = await supabase
        .from('vehicles')
        .select('*');

      if (vError) throw vError;
      setVehicles(vehiclesData || []);

      // Calculate alerts
      const tempAlerts = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      vehiclesData?.forEach(v => {
        // Check PUC
        if (v.puc_expiry_date) {
          const diffTime = new Date(v.puc_expiry_date) - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            tempAlerts.push({ vehicleId: v.id, type: 'error', text: `${v.nickname || v.registration_number}: PUC expired!` });
          } else if (diffDays <= 15) {
            tempAlerts.push({ vehicleId: v.id, type: 'warning', text: `${v.nickname || v.registration_number}: PUC expires in ${diffDays} days` });
          }
        }
        
        // Check Insurance
        if (v.insurance_expiry_date) {
          const diffTime = new Date(v.insurance_expiry_date) - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            tempAlerts.push({ vehicleId: v.id, type: 'error', text: `${v.nickname || v.registration_number}: Insurance expired!` });
          } else if (diffDays <= 30) {
            tempAlerts.push({ vehicleId: v.id, type: 'warning', text: `${v.nickname || v.registration_number}: Insurance expires in ${diffDays} days` });
          }
        }

        // Check General Service
        const svcType = v.service_reminder_type || 'none';
        if (svcType !== 'none') {
          const isOdo = svcType === 'odometer' || svcType === 'both';
          const isDate = svcType === 'date' || svcType === 'both';
          let svcOverdue = false;

          if (isOdo && v.service_due_odometer && v.current_odometer >= v.service_due_odometer) {
            svcOverdue = true;
          }
          if (isDate && v.service_due_date && new Date(v.service_due_date) <= today) {
            svcOverdue = true;
          }
          if (svcOverdue) {
            tempAlerts.push({ vehicleId: v.id, type: 'error', text: `${v.nickname || v.registration_number}: General service is overdue!` });
          }
        }

        // Check Oil
        const oilType = v.oil_reminder_type || 'none';
        if (oilType !== 'none') {
          const isOdo = oilType === 'odometer' || oilType === 'both';
          const isDate = oilType === 'date' || oilType === 'both';
          let oilOverdue = false;

          if (isOdo && v.oil_due_odometer && v.current_odometer >= v.oil_due_odometer) {
            oilOverdue = true;
          }
          if (isDate && v.oil_due_date && new Date(v.oil_due_date) <= today) {
            oilOverdue = true;
          }
          if (oilOverdue) {
            tempAlerts.push({ vehicleId: v.id, type: 'error', text: `${v.nickname || v.registration_number}: Engine oil change is overdue!` });
          }
        }
      });
      setAlerts(tempAlerts);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPucStatus = (expiryDate) => {
    if (!expiryDate) return "PUC: N/A";
    const diff = new Date(expiryDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "PUC: Expired";
    if (days <= 15) return `PUC: ${days}d`;
    return "PUC: Active";
  };

  const getInsuranceStatus = (expiryDate) => {
    if (!expiryDate) return "Ins: N/A";
    const diff = new Date(expiryDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Ins: Expired";
    return "Ins: Valid";
  };

  const getServiceStatus = (v) => {
    const type = v.service_reminder_type || 'none';
    if (type === 'none') return "Svc: N/A";
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const isOdo = type === 'odometer' || type === 'both';
    const isDate = type === 'date' || type === 'both';
    
    if (isOdo && v.service_due_odometer && v.current_odometer >= v.service_due_odometer) return "Svc: Overdue";
    if (isDate && v.service_due_date && new Date(v.service_due_date) <= today) return "Svc: Overdue";
    return "Svc: Ok";
  };

  const getOilStatus = (v) => {
    const type = v.oil_reminder_type || 'none';
    if (type === 'none') return "Oil: N/A";
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const isOdo = type === 'odometer' || type === 'both';
    const isDate = type === 'date' || type === 'both';
    
    if (isOdo && v.oil_due_odometer && v.current_odometer >= v.oil_due_odometer) return "Oil: Overdue";
    if (isDate && v.oil_due_date && new Date(v.oil_due_date) <= today) return "Oil: Overdue";
    return "Oil: Ok";
  };

  const handleQuickAction = (action) => {
    if (vehicles.length === 0) return;
    if (vehicles.length === 1) {
      navigateToVehicleAction(vehicles[0].id, action);
    } else {
      setPendingAction(action);
      setShowSelectModal(true);
    }
  };

  const navigateToVehicleAction = (vehicleId, action) => {
    setShowSelectModal(false);
    if (action === 'puc') {
      navigate(`/vehicles/${vehicleId}/puc-history?action=add`);
    } else if (action === 'insurance') {
      navigate(`/vehicles/${vehicleId}/documents?action=add-insurance`);
    } else if (action === 'service') {
      navigate(`/vehicles/${vehicleId}/service?action=add`);
    } else if (action === 'oil') {
      navigate(`/vehicles/${vehicleId}/oil?action=add`);
    }
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
      fetchUserData();
    } catch (err) {
      console.error("Error updating odometer:", err);
      setOdoError(err.message || "Failed to update odometer.");
    } finally {
      setOdoLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col pb-[80px] font-body">
      {/* Top Header */}
      <TopAppBar 
        title="Vaahan" 
        subtitle={userName ? `Welcome back, ${userName} 👋` : "Your Vehicle Companion"}
        rightElement={
          <button 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        }
      />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading garage...</span>
        </div>
      ) : vehicles.length === 0 ? (
        /* Empty State */
        <main className="flex-1 px-container-margin flex flex-col justify-center items-center">
          <div className="w-full flex flex-col items-center justify-center space-y-stack-gap-lg px-4 text-center">
            <div className="w-48 h-48 mb-4 relative flex items-center justify-center select-none">
              <div className="w-32 h-24 bg-surface-container-high rounded-xl relative overflow-hidden border border-outline-variant/30">
                <div className="absolute top-4 left-4 right-4 h-8 bg-surface-variant rounded-t-lg"></div>
                <div className="absolute bottom-2 left-6 w-6 h-6 bg-surface-variant rounded-full"></div>
                <div className="absolute bottom-2 right-6 w-6 h-6 bg-surface-variant rounded-full"></div>
                <span className="material-symbols-outlined text-[64px] text-outline absolute inset-0 m-auto flex items-center justify-center opacity-50">
                  directions_car
                </span>
              </div>
            </div>
            <div className="space-y-stack-gap-sm">
              <h2 className="font-headline-md text-headline-md text-primary">No vehicles yet</h2>
              <p className="font-body-md text-body-md text-on-surface-variant px-4">
                Add your vehicle to start managing insurance, RC details, and tracking fuel efficiently.
              </p>
            </div>
            <button 
              onClick={() => navigate('/vehicles/add/step1')}
              className="mt-8 bg-[#E8690B] text-white font-label-lg text-label-lg w-full py-4 rounded-[12px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(232,105,11,0.2)] hover:bg-[#D55F09] active:scale-95 transition-all font-semibold"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Your Vehicle
            </button>
          </div>
        </main>
      ) : (
        /* Populated State */
        <main className="flex-1 px-container-margin py-4 flex flex-col gap-6">
          {/* Alerts Area */}
          {alerts.length > 0 && (
            <div 
              onClick={() => navigate('/reminders')}
              className="bg-error-container text-on-error-container border-l-4 border-error rounded-xl p-4 flex items-center justify-between shadow-ambient-lvl1 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-error/10 p-2 rounded-full flex-shrink-0">
                  <span className="material-symbols-outlined text-error">priority_high</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                    {alerts.length} item{alerts.length > 1 ? 's' : ''} need attention
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    PUC, Insurance, or Services are overdue
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </div>
          )}

          {/* Quick Actions Grid (2x2) */}
          <section className="flex flex-col gap-3">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleQuickAction('puc')}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-ambient-lvl1 hover:bg-surface-container-low active:scale-95 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                  <span className="material-symbols-outlined text-primary">air</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">Add PUC</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Renew clearance</span>
                </div>
              </button>

              <button 
                onClick={() => handleQuickAction('insurance')}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-ambient-lvl1 hover:bg-surface-container-low active:scale-95 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">Insurance</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Update policy</span>
                </div>
              </button>

              <button 
                onClick={() => handleQuickAction('service')}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-ambient-lvl1 hover:bg-surface-container-low active:scale-95 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                  <span className="material-symbols-outlined text-primary">build</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">Service Log</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Log maintenance</span>
                </div>
              </button>

              <button 
                onClick={() => handleQuickAction('oil')}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-ambient-lvl1 hover:bg-surface-container-low active:scale-95 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors shrink-0">
                  <span className="material-symbols-outlined text-primary">local_gas_station</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">Oil Tracker</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Engine oil change</span>
                </div>
              </button>
            </div>
          </section>

          {/* Garage List */}
          <section className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Your Garage</h3>
              <button 
                onClick={() => navigate('/vehicles')}
                className="font-label-sm text-label-sm text-secondary flex items-center hover:underline font-bold"
              >
                See all <span className="material-symbols-outlined text-[16px] ml-0.5">chevron_right</span>
              </button>
            </div>
                        <div className="flex flex-col gap-3">
              {vehicles.map(v => {
                const isScooter = v.vehicle_type === 'scooter';
                const pStatus = getPucStatus(v.puc_expiry_date);
                const iStatus = getInsuranceStatus(v.insurance_expiry_date);
                const sStatus = getServiceStatus(v);
                const oStatus = getOilStatus(v);

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
                      
                      {/* Right content flex wrapper */}
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
                      <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(pStatus)}`}>
                        {pStatus}
                      </span>
                      <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(iStatus)}`}>
                        {iStatus}
                      </span>
                      <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(sStatus)}`}>
                        {sStatus}
                      </span>
                      <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${getBadgeColor(oStatus)}`}>
                        {oStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Action Shortcut */}
          <button 
            onClick={() => navigate('/vehicles/add/step1')}
            className="w-full bg-[#E8690B] text-white font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(232,105,11,0.2)] mt-2"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add New Vehicle
          </button>
        </main>
      )}

      {/* Select Vehicle Modal Overlay */}
      {showSelectModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowSelectModal(false)}></div>
          <div className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Select Vehicle</h3>
              <button 
                onClick={() => setShowSelectModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <p className="font-body-md text-body-md text-on-surface-variant">
              Which vehicle would you like to update?
            </p>

            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
              {vehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => navigateToVehicleAction(v.id, pendingAction)}
                  className="flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low text-left active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-primary bg-primary-fixed p-1.5 rounded-full shrink-0">
                    {v.vehicle_type === 'scooter' ? 'two_wheeler' : 'directions_car'}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-on-surface leading-tight">{v.nickname || v.model_name}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{v.registration_number}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Update Odometer Modal Overlay */}
      {showOdoModal && selectedVehicleForOdo && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowOdoModal(false)}></div>
          <form 
            onSubmit={handleUpdateOdometerSubmit}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4"
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

export default Dashboard;
