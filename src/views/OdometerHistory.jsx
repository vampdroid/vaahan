import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import { useApp } from '../context/AppContext';
import { formatDistance, getDistanceUnit } from '../services/utils';

export function OdometerHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshVehicles } = useApp();

  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [odometerValue, setOdometerValue] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicleAndLogs();
  }, [id]);

  const fetchVehicleAndLogs = async () => {
    setLoading(true);
    try {
      // Fetch vehicle details
      const { data: vData, error: vError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id);

      if (vError) throw vError;
      if (vData && vData.length > 0) {
        setVehicle(vData[0]);
      } else {
        navigate('/dashboard');
        return;
      }

      // Fetch odometer logs
      const { data: logsData, error: lError } = await supabase
        .from('odometer_logs')
        .select('*')
        .eq('vehicle_id', id)
        .order('logged_at', { ascending: false });

      if (lError) throw lError;
      setLogs(logsData || []);
    } catch (err) {
      console.error('Error fetching odometer logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOdometer = async (e) => {
    e.preventDefault();
    const val = parseFloat(odometerValue);
    const unit = getDistanceUnit();
    if (!odometerValue || isNaN(val) || val < 0) {
      setFormError('Please enter a valid odometer reading.');
      return;
    }

    // Convert input if in miles
    const normalizedInputVal = unit === 'mi' ? Math.round(val * 1.60934) : val;
    const currentOdoInUnit = unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer;

    if (val < currentOdoInUnit) {
      setFormError(`New odometer reading should not be less than current odometer (${currentOdoInUnit.toLocaleString()} ${unit}).`);
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      // 1. Insert odometer log (normalized to km)
      const { error: lError } = await supabase
        .from('odometer_logs')
        .insert({
          vehicle_id: id,
          value: normalizedInputVal,
          logged_at: new Date(logDate).toISOString()
        });

      if (lError) throw lError;

      // 2. Update current_odometer in vehicles table if this is the highest/latest reading
      const maxVal = Math.max(normalizedInputVal, ...logs.map(l => l.value), vehicle.current_odometer);
      if (normalizedInputVal >= maxVal) {
        const { error: vError } = await supabase
          .from('vehicles')
          .update({ current_odometer: normalizedInputVal })
          .eq('id', id);
        if (vError) throw vError;
      }

      // 3. Refresh context cache & page logs
      await refreshVehicles();
      setShowAddModal(false);
      setOdometerValue('');
      setLogDate(new Date().toISOString().split('T')[0]);
      await fetchVehicleAndLogs();
    } catch (err) {
      console.error('Error logging odometer:', err);
      setFormError(err.message || 'Could not save odometer log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId, valToDelete) => {
    if (!window.confirm('Are you sure you want to delete this odometer log?')) return;
    
    try {
      const { error: dError } = await supabase
        .from('odometer_logs')
        .delete()
        .eq('id', logId);

      if (dError) throw dError;

      // After deleting, recalculate what the latest current_odometer of the vehicle should be
      const remainingLogs = logs.filter(l => l.id !== logId);
      if (valToDelete === vehicle.current_odometer) {
        const nextMax = remainingLogs.length > 0 
          ? Math.max(...remainingLogs.map(l => l.value)) 
          : 0;
        
        await supabase
          .from('vehicles')
          .update({ current_odometer: nextMax })
          .eq('id', id);
      }

      await refreshVehicles();
      await fetchVehicleAndLogs();
    } catch (err) {
      console.error('Error deleting odometer log:', err);
      alert('Could not delete log. Please try again.');
    }
  };

  // Compute stats
  const calculateAverages = () => {
    if (logs.length < 2) return { actualDaily: null, actualWeekly: null };
    
    // Sort logs chronologically ascending
    const sorted = [...logs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];
    
    const timeDiff = new Date(latest.logged_at) - new Date(earliest.logged_at);
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 1) {
      return { actualDaily: null, actualWeekly: null };
    }
    
    const kmDiff = latest.value - earliest.value;
    const actualDaily = kmDiff / daysDiff;
    const actualWeekly = actualDaily * 7;
    
    return { actualDaily, actualWeekly };
  };

  const { actualDaily, actualWeekly } = calculateAverages();
  const unit = getDistanceUnit();

  if (loading || !vehicle) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading odometer logs...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body pb-[80px]">
      <TopAppBar 
        title="Odometer Log" 
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
        {/* Current Odo Status Card */}
        <div className="bg-primary-fixed border border-outline-variant/30 rounded-2xl p-4 shadow-ambient-lvl1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">speed</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">Current Reading</span>
              <h2 className="font-display-lg text-display-lg text-primary font-bold leading-none mt-1">
                {formatDistance(vehicle.current_odometer || 0)}
              </h2>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <section className="flex flex-col gap-3">
          <h3 className="font-headline-md text-headline-md text-primary font-bold px-1">Usage Analytics</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Daily Averages */}
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 shadow-ambient-lvl1 flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold block">Daily Drive</span>
                <span className="font-display-md text-display-md text-primary font-bold block mt-2">
                  {actualDaily !== null ? `${Math.round(unit === 'mi' ? actualDaily / 1.60934 : actualDaily)} ${unit}` : 'Calculating...'}
                </span>
                {actualDaily !== null && (
                  <span className="font-body-sm text-body-sm text-on-surface-variant/80 block mt-1">
                    Based on actual logs
                  </span>
                )}
              </div>
              <div className="border-t border-outline-variant/30 pt-2 mt-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant/75 block font-medium">
                  Estimate: {formatDistance(vehicle.est_daily_km || 0)}/day
                </span>
              </div>
            </div>

            {/* Weekly Averages */}
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 shadow-ambient-lvl1 flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold block">Weekly Drive</span>
                <span className="font-display-md text-display-md text-primary font-bold block mt-2">
                  {actualWeekly !== null ? `${Math.round(unit === 'mi' ? actualWeekly / 1.60934 : actualWeekly)} ${unit}` : 'Calculating...'}
                </span>
                {actualWeekly !== null && (
                  <span className="font-body-sm text-body-sm text-on-surface-variant/80 block mt-1">
                    Based on actual logs
                  </span>
                )}
              </div>
              <div className="border-t border-outline-variant/30 pt-2 mt-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant/75 block font-medium">
                  Estimate: {formatDistance(vehicle.est_weekly_km || 0)}/week
                </span>
              </div>
            </div>
          </div>

          {actualDaily !== null && vehicle.est_daily_km > 0 && (
            <div className="bg-pastel-teal/10 border border-pastel-teal/30 rounded-xl p-3.5 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-pastel-teal-dark mt-0.5">info</span>
              <p className="font-body-md text-body-md text-pastel-teal-dark leading-relaxed">
                {actualDaily > vehicle.est_daily_km ? (
                  <>You are driving <strong>{Math.round(((actualDaily - vehicle.est_daily_km) / vehicle.est_daily_km) * 100)}% more</strong> than your estimated usage.</>
                ) : (
                  <>You are driving <strong>{Math.round(((vehicle.est_daily_km - actualDaily) / vehicle.est_daily_km) * 100)}% less</strong> than your estimated usage.</>
                )}
              </p>
            </div>
          )}
        </section>

        {/* History timeline */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-primary font-bold px-1">Odometer History</h3>

          {logs.length === 0 ? (
            <div className="text-center p-8 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl shadow-ambient-lvl1">
              <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-2">speed</span>
              <h4 className="font-label-lg text-label-lg font-bold text-primary">No Odometer Logs</h4>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                You haven't logged any odometer values yet.
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
                      <h4 className="font-label-lg text-label-lg text-primary font-bold">
                        {formatDistance(log.value)}
                      </h4>
                      <span className="font-label-sm text-label-sm text-on-surface-variant block mt-0.5">
                        Logged on {new Date(log.logged_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                      </span>
                    </div>

                    {logs.length > 1 && (
                      <button 
                        onClick={() => handleDeleteLog(log.id, log.value)}
                        className="p-1 rounded-full hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors"
                        title="Delete log entry"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Action Button */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full bg-[#E8690B] hover:bg-[#D55F09] text-white font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(232,105,11,0.2)] mt-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Odometer Reading
        </button>
      </main>

      {/* Add Odometer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)}></div>
          <form 
            onSubmit={handleAddOdometer}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">New Odometer Log</h3>
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
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Odometer Reading ({unit})</label>
                <input 
                  type="number"
                  value={odometerValue}
                  onChange={(e) => setOdometerValue(e.target.value)}
                  placeholder={`Current: ${Math.round(unit === 'mi' ? vehicle.current_odometer / 1.60934 : vehicle.current_odometer)} ${unit}`}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Logged Date</label>
                <input 
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>
            </div>

            {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Log Record'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default OdometerHistory;
