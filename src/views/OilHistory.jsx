import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import { formatDate, formatDistance, getDistanceUnit } from '../services/utils';

export function OilHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  // Oil reminder settings states
  const [oilReminderType, setOilReminderType] = useState('odometer');
  const [oilDueOdometer, setOilDueOdometer] = useState('');
  const [oilDueDate, setOilDueDate] = useState('');

  // Form states for adding oil change log
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('1200'); // default estimate for engine oil + filter
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const unit = getDistanceUnit();

  useEffect(() => {
    fetchVehicleAndLogs();
  }, [id]);

  const fetchVehicleAndLogs = async () => {
    setLoading(true);
    try {
      // Fetch vehicle details
      const { data: vData, error: vError } = await supabase.from('vehicles').select('*').eq('id', id);
      if (vError) throw vError;
      if (vData && vData.length > 0) {
        const v = vData[0];
        setVehicle(v);
        setOilReminderType(v.oil_reminder_type || 'none');
        
        const dueOdo = v.oil_due_odometer || '';
        const convertedDueOdo = (dueOdo && unit === 'mi') ? Math.round(dueOdo / 1.60934) : dueOdo;
        setOilDueOdometer(convertedDueOdo ? convertedDueOdo.toString() : '');
        setOilDueDate(v.oil_due_date || '');
      } else {
        navigate('/dashboard');
        return;
      }

      // Fetch oil change logs (entry_type = 'oil_change')
      const { data: logData, error: logError } = await supabase
        .from('service_logs')
        .select('*')
        .eq('vehicle_id', id)
        .eq('entry_type', 'oil_change')
        .order('date', { ascending: false });

      if (logError) throw logError;
      setLogs(logData || []);
    } catch (err) {
      console.error("Error loading oil log details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReminders = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const odoVal = oilDueOdometer ? parseFloat(oilDueOdometer) : null;
      const normalizedOdo = (odoVal && unit === 'mi') ? Math.round(odoVal * 1.60934) : odoVal;

      const updates = {
        oil_reminder_type: oilReminderType,
        oil_due_odometer: normalizedOdo,
        oil_due_date: (oilReminderType === 'date' || oilReminderType === 'both') ? oilDueDate : null
      };

      const { error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setShowReminderSettings(false);
      fetchVehicleAndLogs();
    } catch (err) {
      console.error("Error updating reminders:", err);
      setFormError(err.message || "Failed to update reminder settings.");
    }
  };

  const handleAddOil = async (e) => {
    e.preventDefault();
    if (!odometer || parseFloat(odometer) < 0) {
      setFormError("Please enter a valid odometer reading.");
      return;
    }
    if (!cost || parseFloat(cost) < 0) {
      setFormError("Please enter a valid cost.");
      return;
    }

    const inputOdo = parseFloat(odometer);
    const currentOdoInUnit = unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer;

    if (inputOdo < currentOdoInUnit) {
      setFormError(`Odometer reading cannot be less than current odometer (${currentOdoInUnit.toLocaleString()} ${unit}).`);
      return;
    }

    setFormError('');
    setSaveLoading(true);
    try {
      const normalizedOdoVal = unit === 'mi' ? Math.round(inputOdo * 1.60934) : inputOdo;
      const costVal = parseFloat(cost);

      const newEntry = {
        vehicle_id: id,
        entry_type: 'oil_change',
        date: date,
        odometer: normalizedOdoVal,
        cost: costVal,
        details: ['Engine Oil Replaced', 'Oil Filter Changed'],
        notes: notes.trim() || 'Engine Oil replacement'
      };

      const { error } = await supabase.from('service_logs').insert(newEntry);
      if (error) throw error;

      // Update vehicle current odometer if higher
      const updates = {};
      if (normalizedOdoVal > vehicle.current_odometer) {
        updates.current_odometer = normalizedOdoVal;
      }
      
      // Auto-bump oil due odometer by 3000 km if odometer-based reminder is enabled
      if (oilReminderType === 'odometer' || oilReminderType === 'both') {
        updates.oil_due_odometer = normalizedOdoVal + 3000;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('vehicles')
          .update(updates)
          .eq('id', id);
      }

      setShowAddModal(false);
      resetForm();
      fetchVehicleAndLogs();
    } catch (err) {
      console.error("Error adding oil log:", err);
      setFormError(err.message || "Could not save oil change entry. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    
    const currentOdoInUnit = vehicle ? (unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer) : '';
    setOdometer(currentOdoInUnit ? currentOdoInUnit.toString() : '');
    setCost('1200');
    setNotes('');
    setFormError('');
  };

  const lastOil = logs[0];
  const statLastOilDate = lastOil ? formatDate(lastOil.date) : 'Never logged';
  const statLastOilOdo = lastOil ? formatDistance(lastOil.odometer) : 'N/A';

  const isOdoReminder = oilReminderType === 'odometer' || oilReminderType === 'both';
  const isDateReminder = oilReminderType === 'date' || oilReminderType === 'both';

  if (loading || !vehicle) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading Oil logs...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="Oil Tracker Log" 
        subtitle={vehicle.nickname || vehicle.model_name}
        showBack={true}
        rightElement={
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        }
      />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-5 overflow-y-auto pb-24">
        
        {/* Reminder Settings / Info Card */}
        <section className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 shadow-ambient-lvl1 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-label-lg text-label-lg text-primary font-bold">Oil Change Reminder</h3>
            <button 
              onClick={() => {
                setFormError('');
                setShowReminderSettings(!showReminderSettings);
              }}
              className="text-secondary font-label-sm text-label-sm flex items-center gap-1 font-bold hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">settings</span>
              {showReminderSettings ? 'Cancel' : 'Configure'}
            </button>
          </div>

          {showReminderSettings ? (
            <form onSubmit={handleUpdateReminders} className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Reminder Type</label>
                <select 
                  value={oilReminderType}
                  onChange={(e) => setOilReminderType(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none"
                >
                  <option value="none">No Reminder</option>
                  <option value="odometer">Odometer-based (Distance)</option>
                  <option value="date">Date-based (Time)</option>
                  <option value="both">Both (Whichever is earlier)</option>
                </select>
              </div>

              {(oilReminderType === 'odometer' || oilReminderType === 'both') && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Next Oil Change Odometer ({unit})</label>
                  <input 
                    type="number"
                    value={oilDueOdometer}
                    onChange={(e) => setOilDueOdometer(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none"
                    required
                  />
                </div>
              )}

              {(oilReminderType === 'date' || oilReminderType === 'both') && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Next Oil Change Due Date</label>
                  <input 
                    type="date"
                    value={oilDueDate}
                    onChange={(e) => setOilDueDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none"
                    required
                  />
                </div>
              )}

              {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

              <button 
                type="submit"
                className="bg-secondary text-white font-label-sm text-label-sm py-2 rounded-xl font-bold mt-1 shadow-sm active:scale-95 transition-transform"
              >
                Save Preferences
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant opacity-75">Last Oil Change</span>
                <span className="font-body-lg text-body-lg text-primary font-bold leading-tight">{statLastOilDate}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">At {statLastOilOdo}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant opacity-75">Next Due</span>
                {oilReminderType === 'none' ? (
                  <span className="font-body-lg text-body-lg text-on-surface-variant font-medium">Not configured</span>
                ) : (
                  <>
                    {isDateReminder && (
                      <span className="font-body-lg text-body-lg text-primary font-bold leading-tight">
                        {formatDate(oilDueDate)}
                      </span>
                    )}
                    {isOdoReminder && (
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {isDateReminder ? 'Or at ' : 'At '}{vehicle.oil_due_odometer ? formatDistance(vehicle.oil_due_odometer) : 'N/A'}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* History Log */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Oil Change History</h3>
          
          {logs.length === 0 ? (
            <div className="text-center p-8 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl shadow-ambient-lvl1 mt-2">
              <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-2">local_gas_station</span>
              <h4 className="font-label-lg text-label-lg font-bold text-primary">No Records Logged</h4>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Tap the '+' or add log button to record oil changes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-l border-outline-variant/40 ml-4 pl-4 relative">
              {logs.map((log) => (
                <div key={log.id} className="relative flex flex-col gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-ambient-lvl1">
                  
                  {/* Timeline bullet */}
                  <div className="absolute -left-[25px] top-5 w-4 h-4 rounded-full bg-secondary border-2 border-surface shadow-sm"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-label-lg text-label-lg text-primary font-bold">
                        Engine Oil Replaced
                      </h4>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {formatDate(log.date)} • {formatDistance(log.odometer)}
                      </span>
                      {log.notes && (
                        <p className="font-body-md text-body-md text-on-surface-variant mt-2 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                    <span className="font-label-lg text-label-lg text-primary font-semibold">
                      ₹{Number(log.cost).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add Entry CTA */}
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="w-full bg-[#E8690B] text-white font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(232,105,11,0.2)] mt-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Oil Change Log
        </button>
      </main>

      {/* Add Log Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)}></div>
          <form 
            onSubmit={handleAddOil}
            className="bg-surface text-on-surface w-full max-w-[340px] border border-outline-variant/30 rounded-2xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Add Oil Log</h3>
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
                  placeholder={`e.g. ${unit === 'mi' ? '8000' : '12500'}`}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Total Cost (₹)</label>
                <input 
                  type="number"
                  placeholder="e.g. 1200"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Notes / Station</label>
                <input 
                  type="text"
                  placeholder="e.g. Shell Petrol Pump"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>
            </div>

            {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

            <button 
              type="submit"
              disabled={saveLoading}
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {saveLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Save Oil Log
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default OilHistory;
