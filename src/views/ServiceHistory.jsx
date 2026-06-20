import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { formatDate, formatDistance, getDistanceUnit } from '../services/utils';

export function ServiceHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  // Reminder settings states
  const [serviceReminderType, setServiceReminderType] = useState('odometer');
  const [serviceDueOdometer, setServiceDueOdometer] = useState('');
  const [serviceDueDate, setServiceDueDate] = useState('');

  // Form states for adding log
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState('');

  const unit = getDistanceUnit();

  useEffect(() => {
    fetchVehicleAndLogs();
  }, [id]);

  const fetchVehicleAndLogs = async () => {
    setLoading(true);
    try {
      // 1. Fetch vehicle details
      const { data: vData, error: vError } = await supabase.from('vehicles').select('*').eq('id', id);
      if (vError) throw vError;
      if (vData && vData.length > 0) {
        const v = vData[0];
        setVehicle(v);
        setServiceReminderType(v.service_reminder_type || 'none');
        
        const dueOdo = v.service_due_odometer || '';
        const convertedDueOdo = (dueOdo && unit === 'mi') ? Math.round(dueOdo / 1.60934) : dueOdo;
        setServiceDueOdometer(convertedDueOdo ? convertedDueOdo.toString() : '');
        setServiceDueDate(v.service_due_date || '');
      } else {
        navigate('/dashboard');
        return;
      }

      // 2. Fetch service logs of type 'service'
      const { data: logsData, error: lError } = await supabase
        .from('service_logs')
        .select('*')
        .eq('vehicle_id', id)
        .eq('entry_type', 'service')
        .order('date', { ascending: false });

      if (lError) throw lError;
      setLogs(logsData || []);
    } catch (err) {
      console.error("Error loading service data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const odoVal = serviceDueOdometer ? parseFloat(serviceDueOdometer) : null;
      const normalizedOdo = (odoVal && unit === 'mi') ? Math.round(odoVal * 1.60934) : odoVal;

      const { error } = await supabase
        .from('vehicles')
        .update({
          service_reminder_type: serviceReminderType,
          service_due_odometer: normalizedOdo,
          service_due_date: (serviceReminderType === 'date' || serviceReminderType === 'both') ? serviceDueDate : null
        })
        .eq('id', id);

      if (error) throw error;
      setShowReminderSettings(false);
      fetchVehicleAndLogs();
    } catch (err) {
      console.error("Error saving service settings:", err);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!odometer || parseFloat(odometer) < 0) {
      setFormError("Please enter a valid odometer reading.");
      return;
    }

    const inputOdo = parseFloat(odometer);
    const currentOdoInUnit = unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer;

    if (inputOdo < currentOdoInUnit) {
      setFormError(`Odometer reading cannot be less than current odometer (${currentOdoInUnit.toLocaleString()} ${unit}).`);
      return;
    }

    setFormError('');
    try {
      const normalizedOdoVal = unit === 'mi' ? Math.round(inputOdo * 1.60934) : inputOdo;
      const costVal = cost ? parseFloat(cost) : 0;
      
      // Auto bump service due odometer by 5000 km if odometer-based reminder is enabled
      let nextDueOdo = vehicle.service_due_odometer;
      if (serviceReminderType === 'odometer' || serviceReminderType === 'both') {
        nextDueOdo = normalizedOdoVal + 5000;
      }
      
      const detailItems = details.split('\n').map(d => d.trim()).filter(Boolean);

      const newLog = {
        vehicle_id: id,
        entry_type: 'service',
        date: date,
        odometer: normalizedOdoVal,
        cost: costVal,
        notes: notes || "Routine Maintenance",
        details: detailItems
      };

      // 1. Insert service log
      const { error: lError } = await supabase.from('service_logs').insert(newLog);
      if (lError) throw lError;

      // 2. Update vehicle odometer and next due odometer
      const { error: vError } = await supabase
        .from('vehicles')
        .update({ 
          current_odometer: normalizedOdoVal,
          service_due_odometer: nextDueOdo
        })
        .eq('id', id);

      if (vError) throw vError;

      setShowAddModal(false);
      resetForm();
      fetchVehicleAndLogs();
    } catch (err) {
      console.error("Error adding service log:", err);
      setFormError(err.message || "Failed to save service log.");
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    
    const currentOdoInUnit = vehicle ? (unit === 'mi' ? Math.round(vehicle.current_odometer / 1.60934) : vehicle.current_odometer) : '';
    setOdometer(currentOdoInUnit ? currentOdoInUnit.toString() : '');
    setCost('');
    setNotes('');
    setDetails('');
    setFormError('');
  };

  const lastService = logs[0];
  const statLastServiceDate = lastService ? formatDate(lastService.date) : 'None';
  const statLastServiceOdo = lastService ? formatDistance(lastService.odometer) : 'N/A';

  const isOdoReminder = serviceReminderType === 'odometer' || serviceReminderType === 'both';
  const isDateReminder = serviceReminderType === 'date' || serviceReminderType === 'both';

  if (loading || !vehicle) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading logs...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="General Service" 
        subtitle={vehicle.nickname || vehicle.model_name}
        showBack={true}
        rightElement={
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowReminderSettings(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined">notifications_active</span>
            </button>
            <button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-5 overflow-y-auto">
        {/* Quick Stats Grid */}
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-ambient-lvl1">
          {logs.length === 0 ? (
            <div className="text-center py-4 select-none">
              <span className="material-symbols-outlined text-[40px] text-outline opacity-40 mb-1">build</span>
              <p className="font-label-lg text-label-lg text-on-surface-variant font-medium">No service records tracked yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 divide-x divide-outline-variant/30">
              <div className="flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant opacity-75">Last Service</span>
                <span className="font-body-lg text-body-lg text-primary font-bold leading-tight">{statLastServiceDate}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">At {statLastServiceOdo}</span>
              </div>
              <div className="flex flex-col gap-0.5 pl-4">
                <span className="font-label-sm text-label-sm text-on-surface-variant opacity-75">Next Service Due</span>
                {serviceReminderType === 'none' ? (
                  <span className="font-body-lg text-body-lg text-on-surface-variant font-medium">Not configured</span>
                ) : (
                  <>
                    {isDateReminder && (
                      <span className="font-body-lg text-body-lg text-primary font-bold leading-tight">
                        {formatDate(serviceDueDate)}
                      </span>
                    )}
                    {isOdoReminder && (
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {isDateReminder ? 'Or at ' : 'At '}{vehicle.service_due_odometer ? formatDistance(vehicle.service_due_odometer) : 'N/A'}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Timeline Log Lists */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">History Log</h3>
          
          {logs.length === 0 ? (
            <div className="text-center p-8 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl shadow-ambient-lvl1 mt-2">
              <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-2">history</span>
              <h4 className="font-label-lg text-label-lg font-bold text-primary">No Records Logged</h4>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Tap the '+' or add log button to record service entries.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-l border-outline-variant/40 ml-4 pl-4 relative">
              {logs.map((log) => (
                <div key={log.id} className="relative flex flex-col gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-ambient-lvl1">
                  
                  {/* Timeline bullet decorator */}
                  <div className="absolute -left-[25px] top-5 w-4 h-4 rounded-full bg-secondary border-2 border-surface shadow-sm"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-label-lg text-label-lg text-primary font-bold">
                        {log.notes || 'Routine Maintenance'}
                      </h4>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {formatDate(log.date)} • {formatDistance(log.odometer)}
                      </span>
                    </div>
                    <span className="font-label-lg text-label-lg text-primary font-semibold">
                      ₹{Number(log.cost).toLocaleString()}
                    </span>
                  </div>

                  {/* Checklist items */}
                  {log.details && log.details.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-outline-variant/30 pt-2 mt-1">
                      {log.details.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                          <span className="material-symbols-outlined text-pastel-teal-dark text-[16px] filled">check_circle</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add service log action */}
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="w-full bg-[#E8690B] text-white font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(232,105,11,0.2)] mt-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Service Log
        </button>
      </main>

      {/* Reminder Config Modal */}
      {showReminderSettings && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowReminderSettings(false)}></div>
          <form 
            onSubmit={handleSaveSettings}
            className="bg-surface text-on-surface w-full max-w-[340px] border border-outline-variant/30 rounded-2xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 animate-scale-up"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Reminder Config</h3>
              <button 
                type="button" 
                onClick={() => setShowReminderSettings(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Track Service By</label>
                <select 
                  value={serviceReminderType} 
                  onChange={(e) => setServiceReminderType(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                >
                  <option value="none">No Reminder</option>
                  <option value="odometer">Odometer Limit Only</option>
                  <option value="date">Time/Date Limit Only</option>
                  <option value="both">Both (Whichever comes first)</option>
                </select>
              </div>

              {(serviceReminderType === 'odometer' || serviceReminderType === 'both') && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Next Service Odometer ({unit})</label>
                  <input 
                    type="number"
                    placeholder={`e.g. ${unit === 'mi' ? '10000' : '15000'}`}
                    value={serviceDueOdometer}
                    onChange={(e) => setServiceDueOdometer(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                    required
                  />
                </div>
              )}

              {(serviceReminderType === 'date' || serviceReminderType === 'both') && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Next Service Date</label>
                  <input 
                    type="date"
                    value={serviceDueDate}
                    onChange={(e) => setServiceDueDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                    required
                  />
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 mt-2"
            >
              Save Configuration
            </button>
          </form>
        </div>
      )}

      {/* Add Service Log Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)}></div>
          <form 
            onSubmit={handleAddLog}
            className="bg-surface text-on-surface w-full max-w-[350px] border border-outline-variant/30 rounded-2xl p-5 shadow-2xl relative z-10 flex flex-col gap-4 animate-scale-up"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">New Service Log</h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Service Odometer ({unit})</label>
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
                <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Cost (₹)</label>
                <input 
                  type="number"
                  placeholder="e.g. 1500"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Service Station / Notes</label>
                <input 
                  type="text"
                  placeholder="e.g. Honda Service, Viman Nagar"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Service Tasks (one per line)</label>
                <textarea 
                  placeholder="e.g. Engine Oil Replaced&#10;Brake Pads Changed&#10;Air Filter Cleaned"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows="3"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none resize-none"
                />
              </div>
            </div>

            {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

            <button 
              type="submit"
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Save Service Log
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ServiceHistory;
