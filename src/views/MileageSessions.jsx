import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import { formatDate, formatDistance, getDistanceUnit } from '../services/utils';

export function MileageSessions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldOpenAdd = searchParams.get('action') === 'add';

  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(shouldOpenAdd);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [litres, setLitres] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [formError, setFormError] = useState('');

  // Calculated Stats
  const [avgMileage, setAvgMileage] = useState(null);
  const [totalKm, setTotalKm] = useState(0);
  const [totalLitres, setTotalLitres] = useState(0);

  const unit = getDistanceUnit();

  useEffect(() => {
    fetchVehicleAndLogs();
  }, [id]);

  const fetchVehicleAndLogs = async () => {
    setLoading(true);
    try {
      // Fetch vehicle
      const { data: vData, error: vError } = await supabase.from('vehicles').select('*').eq('id', id);
      if (vError) throw vError;
      if (vData && vData.length > 0) {
        setVehicle(vData[0]);
      } else {
        navigate('/dashboard');
        return;
      }

      // Fetch mileage logs
      const { data: logsData, error: lError } = await supabase
        .from('mileage_logs')
        .select('*')
        .eq('vehicle_id', id)
        .order('odometer', { ascending: false }); // Sort odometer descending so recent is first

      if (lError) throw lError;
      setLogs(logsData || []);
      
      calculateStats(logsData || []);
    } catch (err) {
      console.error("Error loading mileage data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (mileageLogs) => {
    if (mileageLogs.length < 2) {
      setAvgMileage(null);
      setTotalKm(0);
      setTotalLitres(0);
      return;
    }

    // Sort logs odometer ascending to calculate spans
    const sorted = [...mileageLogs].sort((a, b) => a.odometer - b.odometer);
    
    let totalDriven = 0;
    let totalFuel = 0;
    
    // Find all spans where consecutive entries are full tank
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      if (curr.is_full_tank && prev.is_full_tank) {
        const diffOdo = curr.odometer - prev.odometer;
        if (diffOdo > 0) {
          totalDriven += diffOdo;
          totalFuel += curr.fuel_litres;
        }
      }
    }

    if (totalFuel > 0) {
      const avg = totalDriven / totalFuel;
      setAvgMileage(avg.toFixed(1));
      setTotalKm(totalDriven);
      setTotalLitres(totalFuel);
    } else {
      setAvgMileage(null);
    }
  };

  const handleAddFuel = async (e) => {
    e.preventDefault();
    if (!odometer || parseFloat(odometer) <= 0) {
      setFormError("Please enter a valid odometer reading.");
      return;
    }
    if (!litres || parseFloat(litres) <= 0) {
      setFormError("Please enter the fuel volume in Litres.");
      return;
    }

    const inputOdo = parseFloat(odometer);
    const currentOdoInUnit = unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer;

    // Ensure new odometer is greater than current vehicle odometer
    if (inputOdo <= currentOdoInUnit && logs.length > 0) {
      setFormError(`Odometer must be greater than current reading (${currentOdoInUnit.toLocaleString()} ${unit}).`);
      return;
    }

    setFormError('');
    try {
      // Normalize odometer back to KM for storing in database
      const odoVal = unit === 'mi' ? Math.round(inputOdo * 1.60934) : inputOdo;
      const fuelVal = parseFloat(litres);

      // Find previous log to calculate current mileage
      let calculatedMileage = null;
      if (logs.length > 0) {
        const lastLog = logs[0]; // sorted descending, so index 0 is most recent
        if (isFullTank && lastLog.is_full_tank) {
          const distance = odoVal - lastLog.odometer;
          if (distance > 0) {
            calculatedMileage = parseFloat((distance / fuelVal).toFixed(2));
          }
        }
      }

      const newLog = {
        vehicle_id: id,
        date: date,
        odometer: odoVal,
        fuel_litres: fuelVal,
        is_full_tank: isFullTank,
        mileage_kml: calculatedMileage
      };

      // 1. Insert mileage log
      const { error: lError } = await supabase.from('mileage_logs').insert(newLog);
      if (lError) throw lError;

      // 2. Update vehicle current odometer
      const { error: vError } = await supabase
        .from('vehicles')
        .update({ current_odometer: odoVal })
        .eq('id', id);

      if (vError) throw vError;

      setShowAddModal(false);
      resetForm();
      fetchVehicleAndLogs();
    } catch (err) {
      console.error("Error logging fuel:", err);
      setFormError(err.message || "Could not save fuel entry. Please try again.");
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setOdometer('');
    setLitres('');
    setIsFullTank(true);
    setFormError('');
  };

  if (loading || !vehicle) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading mileage logs...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="Mileage Check" 
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
        {/* Calculation Banner Card */}
        <section className="bg-primary-container text-on-primary rounded-2xl p-6 text-center shadow-[0_8px_20px_rgba(26,60,110,0.15)] flex flex-col items-center relative overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none opacity-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[120px]">local_gas_station</span>
          </div>
          
          <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-widest relative z-10 font-bold mb-1">
            Average Mileage
          </span>
          <div className="flex justify-center items-end gap-1 relative z-10">
            <span className="font-display-lg text-display-lg text-on-primary font-bold">
              {avgMileage 
                ? `~${unit === 'mi' ? (Number(avgMileage) / 1.60934).toFixed(1) : avgMileage}` 
                : 'N/A'}
            </span>
            {avgMileage && <span className="font-body-lg text-body-lg text-on-primary-container mb-1">{unit === 'mi' ? 'mi/l' : 'km/l'}</span>}
          </div>
          <p className="font-label-sm text-label-sm mt-3 opacity-80 relative z-10">
            {avgMileage 
              ? `Based on ${unit === 'mi' ? Math.round(totalKm / 1.60934).toLocaleString() : totalKm.toLocaleString()} ${unit} driven and ${totalLitres.toFixed(1)} L fuel consumed.` 
              : 'Add at least two full tank logs to calculate mileage.'
            }
          </p>
        </section>

        {/* Sessions History List */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Fuel Logs</h3>

          {logs.length === 0 ? (
            <div className="text-center p-8 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl shadow-ambient-lvl1">
              <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-2">local_gas_station</span>
              <h4 className="font-label-lg text-label-lg font-bold text-primary">No Fuel Logs</h4>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                You haven't logged any fuel fill-ups yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log, index) => {
                const fillUpNum = logs.length - index;
                const formattedDate = formatDate(log.date);
                
                return (
                  <div key={log.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between shadow-ambient-lvl1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined">local_gas_station</span>
                      </div>
                      <div>
                        <h4 className="font-label-lg text-label-lg text-primary font-bold">{formatDistance(log.odometer)}</h4>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Fill-up {fillUpNum} • {formattedDate}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="font-body-md text-body-md text-on-surface font-semibold">
                        {log.fuel_litres.toFixed(1)} L
                      </span>
                      {log.is_full_tank && (
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-pastel-teal/30 text-pastel-teal-dark font-semibold">
                          Full Tank
                        </span>
                      )}
                      {log.mileage_kml && (
                        <span className="font-label-sm text-label-sm text-secondary font-bold mt-1">
                          {unit === 'mi' ? (Number(log.mileage_kml) / 1.60934).toFixed(1) : log.mileage_kml} {unit === 'mi' ? 'mi/l' : 'km/l'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Add fuel log action */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full bg-[#E8690B] text-white font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(232,105,11,0.2)] mt-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Fuel Log
        </button>
      </main>

      {/* Add Fuel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)}></div>
          <form 
            onSubmit={handleAddFuel}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Log Fuel Session</h3>
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
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Odometer Reading ({unit})</label>
                <input 
                  type="number"
                  placeholder={`e.g. ${unit === 'mi' ? '8000' : '12656'}`}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Fuel Filled (Litres)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5.0"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 py-1 select-none">
                <input 
                  id="full-tank"
                  type="checkbox"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  className="brand-toggle"
                />
                <label htmlFor="full-tank" className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Filled to Full Tank
                </label>
              </div>
            </div>

            {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

            <button 
              type="submit"
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Save Fuel Log
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default MileageSessions;
