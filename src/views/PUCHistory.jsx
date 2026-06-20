import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import { formatDate } from '../services/utils';

export function PUCHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldOpenAdd = searchParams.get('action') === 'add';

  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(shouldOpenAdd);

  // Form states
  const [expiryDate, setExpiryDate] = useState('');
  const [cost, setCost] = useState('150');
  const [station, setStation] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchVehicleAndLogs();
  }, [id]);

  useEffect(() => {
    if (vehicle) {
      resetForm();
    }
  }, [vehicle]);

  const fetchVehicleAndLogs = async () => {
    setLoading(true);
    try {
      // Fetch vehicle details
      const { data: vData, error: vError } = await supabase.from('vehicles').select('*').eq('id', id);
      if (vError) throw vError;
      if (vData && vData.length > 0) {
        setVehicle(vData[0]);
      } else {
        navigate('/dashboard');
        return;
      }

      // Fetch PUC logs
      const { data: logsData, error: lError } = await supabase
        .from('service_logs')
        .select('*')
        .eq('vehicle_id', id)
        .eq('entry_type', 'puc')
        .order('date', { ascending: false });

      if (lError) throw lError;
      setLogs(logsData || []);
    } catch (err) {
      console.error("Error loading PUC data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPUC = async (e) => {
    e.preventDefault();
    if (!expiryDate) {
      setFormError("Please select the new PUC expiry date.");
      return;
    }

    setFormError('');
    try {
      // 1. Insert service log of type 'puc'
      const newLog = {
        vehicle_id: id,
        entry_type: 'puc',
        date: new Date().toISOString().split('T')[0], // today's date
        cost: cost ? parseFloat(cost) : 0,
        notes: station || "Pollution Testing Center",
        details: [`PUC Expiry Date: ${expiryDate}`]
      };

      const { error: lError } = await supabase.from('service_logs').insert(newLog);
      if (lError) throw lError;

      // 2. Update vehicle's PUC expiry date
      const { error: vError } = await supabase
        .from('vehicles')
        .update({ puc_expiry_date: expiryDate })
        .eq('id', id);

      if (vError) throw vError;

      setShowAddModal(false);
      resetForm();
      fetchVehicleAndLogs();
    } catch (err) {
      console.error("Error logging PUC:", err);
      setFormError(err.message || "Could not save PUC log. Please try again.");
    }
  };

  const resetForm = () => {
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    setExpiryDate(sixMonths.toISOString().split('T')[0]);
    setCost('150');
    setStation('');
    setFormError('');
  };

  const isPucActive = () => {
    if (!vehicle || !vehicle.puc_expiry_date) return false;
    return new Date(vehicle.puc_expiry_date) > new Date();
  };

  const getPucExpiryFormatted = () => {
    if (!vehicle || !vehicle.puc_expiry_date) return 'N/A';
    return formatDate(vehicle.puc_expiry_date);
  };

  if (loading || !vehicle) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading PUC logs...</span>
      </div>
    );
  }

  const active = isPucActive();

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="PUC History" 
        subtitle={vehicle.nickname || vehicle.model_name}
        showBack={true}
        rightElement={
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        }
      />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-5 overflow-y-auto">
        {/* Active Status Card */}
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-ambient-lvl1 ${
          active 
            ? 'bg-pastel-teal/20 border-pastel-teal-dark/30' 
            : 'bg-error-container border-error/30'
        }`}>
          <span className={`material-symbols-outlined text-[28px] filled ${active ? 'text-pastel-teal-dark' : 'text-error'}`}>
            {active ? 'verified' : 'warning'}
          </span>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-primary font-bold">
              PUC is {active ? 'Active' : 'Expired'}
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              {active ? `Valid till ${getPucExpiryFormatted()}` : 'Please renew your pollution certificate'}
            </span>
          </div>
        </div>

        {/* History Timeline */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Renewal Timeline</h3>
          
          {logs.length === 0 ? (
            <div className="text-center p-8 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl shadow-ambient-lvl1">
              <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-2">air</span>
              <h4 className="font-label-lg text-label-lg font-bold text-primary">No PUC History</h4>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                You haven't logged any PUC renewals yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-l border-outline-variant/40 ml-4 pl-4 relative">
              {logs.map((log) => (
                <div key={log.id} className="relative flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-ambient-lvl1">
                  
                  {/* Timeline bullet */}
                  <div className="absolute -left-[25px] top-5 w-4 h-4 rounded-full bg-secondary border-2 border-surface shadow-sm"></div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-label-lg text-label-lg text-primary font-bold">Renewed PUC</h4>
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Logged on {formatDate(log.date)}
                      </span>
                      {log.notes && (
                        <span className="font-body-md text-body-md text-on-surface-variant mt-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-outline">location_on</span>
                          {log.notes}
                        </span>
                      )}
                    </div>
                    <span className="font-label-lg text-label-lg text-primary font-bold">
                      ₹{log.cost}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center text-on-surface-variant font-label-sm text-label-sm shadow-sm select-none">
                Vehicle Registered: {formatDate(vehicle.created_at)}
              </div>
            </div>
          )}
        </section>

        {/* Action Button */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full bg-[#E8690B] text-white font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(232,105,11,0.2)] mt-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add PUC Log
        </button>
      </main>

      {/* Add PUC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)}></div>
          <form 
            onSubmit={handleAddPUC}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 animate-scale-up"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">New PUC Entry</h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">PUC Expiry Date</label>
                <input 
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Testing Fee (₹)</label>
                <input 
                  type="number"
                  placeholder="e.g. 150"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Testing Station</label>
                <input 
                  type="text"
                  placeholder="e.g. HP Petrol Pump, KP"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>
            </div>

            {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

            <button 
              type="submit"
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Save PUC Log
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default PUCHistory;
