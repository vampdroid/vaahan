import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import { getDistanceUnit } from '../services/utils';

export function AddVehicleStep2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFetched = searchParams.get('fetched') === 'true';

  // State fields
  const [regNumber, setRegNumber] = useState('');
  const [modelName, setModelName] = useState('');
  const [vehicleType, setVehicleType] = useState('scooter'); // 'scooter' | 'car'
  const [nickname, setNickname] = useState('');
  const [odometer, setOdometer] = useState('');
  const [weeklyKm, setWeeklyKm] = useState(''); // optional weekly km driven
  
  // Service Reminder setup
  const [serviceReminderType, setServiceReminderType] = useState('odometer'); // 'odometer' | 'date' | 'both' | 'none'
  const [serviceDueOdometer, setServiceDueOdometer] = useState('');
  const [serviceDueDate, setServiceDueDate] = useState('');

  // Oil Change Reminder setup
  const [oilReminderType, setOilReminderType] = useState('odometer'); // 'odometer' | 'date' | 'both' | 'none'
  const [oilDueOdometer, setOilDueOdometer] = useState('');
  const [oilDueDate, setOilDueDate] = useState('');

  const [pucExpiryDate, setPucExpiryDate] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const unit = getDistanceUnit();

  useEffect(() => {
    if (isFetched) {
      const fetchedDataStr = sessionStorage.getItem('temp_vehicle_fetch');
      if (fetchedDataStr) {
        try {
          const data = JSON.parse(fetchedDataStr);
          setRegNumber(data.registration_number ? data.registration_number.toUpperCase().replace(/\s+/g, '') : '');
          setModelName(data.model_name || '');
          setVehicleType(data.vehicle_type || 'scooter');
          if (data.current_odometer) {
            const converted = unit === 'mi' ? Math.round(Number(data.current_odometer) / 1.60934) : data.current_odometer;
            setOdometer(converted.toString());
          }
          if (data.puc_expiry_date) {
            setPucExpiryDate(data.puc_expiry_date);
          }
          if (data.insurance_expiry_date) {
            setInsuranceExpiryDate(data.insurance_expiry_date);
          }
        } catch (e) {
          console.error("Error reading fetched vehicle info", e);
        }
      }
    }
  }, [isFetched, unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanReg = regNumber.toUpperCase().replace(/\s+/g, '');
    
    // Front-end validation for registration plate
    const regPattern = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    if (!regPattern.test(cleanReg)) {
      setErrorMsg("Please enter a valid registration number (e.g. GJ01VA1873).");
      return;
    }

    if (!modelName.trim()) {
      setErrorMsg("Please provide the Make & Model name.");
      return;
    }
    if (!odometer || parseFloat(odometer) < 0) {
      setErrorMsg("Please enter a valid current odometer reading.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';

      // 1. Uniqueness check for vehicle registration number
      const { data: existing, error: checkError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('registration_number', cleanReg)
        .maybeSingle();

      if (checkError) {
        console.error("Uniqueness check error:", checkError);
      }
      if (existing) {
        setErrorMsg(`A vehicle with registration number ${cleanReg} already exists in your garage.`);
        setLoading(false);
        return;
      }

      // Calculate next due values based on settings selected
      const isSvcOdo = serviceReminderType === 'odometer' || serviceReminderType === 'both';
      const isSvcDate = serviceReminderType === 'date' || serviceReminderType === 'both';
      const isOilOdo = oilReminderType === 'odometer' || oilReminderType === 'both';
      const isOilDate = oilReminderType === 'date' || oilReminderType === 'both';

      const newVehicle = {
        user_id: userId,
        registration_number: cleanReg,
        model_name: modelName,
        vehicle_type: vehicleType,
        nickname: nickname.trim() || modelName,
        current_odometer: unit === 'mi' ? Math.round(parseFloat(odometer) * 1.60934) : parseFloat(odometer),
        color: '#E8690B', // Default standard Orange accent color
        puc_expiry_date: pucExpiryDate || null,
        insurance_expiry_date: insuranceExpiryDate || null,
        weekly_km_driven: weeklyKm ? (unit === 'mi' ? Math.round(parseFloat(weeklyKm) * 1.60934) : parseFloat(weeklyKm)) : null,
        
        // Reminder Settings
        service_reminder_type: serviceReminderType,
        service_due_odometer: isSvcOdo && serviceDueOdometer ? (unit === 'mi' ? Math.round(parseFloat(serviceDueOdometer) * 1.60934) : parseFloat(serviceDueOdometer)) : null,
        service_due_date: isSvcDate && serviceDueDate ? serviceDueDate : null,
        
        oil_reminder_type: oilReminderType,
        oil_due_odometer: isOilOdo && oilDueOdometer ? (unit === 'mi' ? Math.round(parseFloat(oilDueOdometer) * 1.60934) : parseFloat(oilDueOdometer)) : null,
        oil_due_date: isOilDate && oilDueDate ? oilDueDate : null
      };

      const { data, error } = await supabase.from('vehicles').insert(newVehicle);
      if (error) throw error;
      
      // Clean up session storage
      sessionStorage.removeItem('temp_vehicle_fetch');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error("Error inserting vehicle:", err);
      setErrorMsg(err.message || "Could not register vehicle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="Add Vehicle details" 
        showBack={true} 
      />

      <main className="flex-1 px-container-margin py-4 overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
          
          {/* Registration plate */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Registration Number (GJ01VA1873 format)
            </label>
            <input 
              type="text"
              placeholder="e.g. GJ01VA1873"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline uppercase shadow-sm"
              required
            />
          </div>

          {/* Model name */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Make & Model
            </label>
            <input 
              type="text"
              placeholder="e.g. Honda Activa 6G"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
              required
            />
          </div>

          {/* Vehicle Type selector */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Vehicle Type</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setVehicleType('scooter')}
                className={`py-3 rounded-xl border flex items-center justify-center gap-2 font-label-lg text-label-lg font-bold transition-all ${
                  vehicleType === 'scooter'
                    ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm'
                    : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">two_wheeler</span>
                Two Wheeler
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('car')}
                className={`py-3 rounded-xl border flex items-center justify-center gap-2 font-label-lg text-label-lg font-bold transition-all ${
                  vehicleType === 'car'
                    ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm'
                    : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">directions_car</span>
                Four Wheeler
              </button>
            </div>
          </div>

          {/* Nickname */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Nickname (Optional)
            </label>
            <input 
              type="text"
              placeholder="e.g. Daily Commute"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
            />
          </div>

          {/* Current Odometer (Always customizable) */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Current Odometer ({unit})
            </label>
            <input 
              type="number"
              placeholder="e.g. 15000"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
              required
            />
          </div>

          {/* Weekly KM Driven (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Weekly Distance Driven ({unit}) (Optional)
            </label>
            <input 
              type="number"
              placeholder="e.g. 150"
              value={weeklyKm}
              onChange={(e) => setWeeklyKm(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
            />
          </div>

          {/* PUC Expiry Date */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              PUC Expiry Date (Optional)
            </label>
            <input 
              type="date"
              value={pucExpiryDate}
              onChange={(e) => setPucExpiryDate(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
            />
          </div>

          {/* Insurance Expiry Date */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Insurance Expiry Date (Optional)
            </label>
            <input 
              type="date"
              value={insuranceExpiryDate}
              onChange={(e) => setInsuranceExpiryDate(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
            />
          </div>

          {/* General Service Reminder Settings */}
          <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-3 mt-1">
            <h4 className="font-headline-md text-headline-md text-primary font-bold">General Service Reminder</h4>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Reminder Type</label>
              <select 
                value={serviceReminderType}
                onChange={(e) => setServiceReminderType(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2.5 font-body-md text-body-md text-on-surface focus:border-primary-container outline-none shadow-sm"
              >
                <option value="odometer">Odometer-based (Distance)</option>
                <option value="date">Date-based (Time)</option>
                <option value="both">Both (Whichever is earlier)</option>
                <option value="none">No Reminder</option>
              </select>
            </div>

            {(serviceReminderType === 'odometer' || serviceReminderType === 'both') && (
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Next Service Due Odometer ({unit})</label>
                <input 
                  type="number"
                  placeholder={`e.g. ${unit === 'mi' ? '12000' : '20000'}`}
                  value={serviceDueOdometer}
                  onChange={(e) => setServiceDueOdometer(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
                  required
                />
              </div>
            )}

            {(serviceReminderType === 'date' || serviceReminderType === 'both') && (
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Next Service Due Date</label>
                <input 
                  type="date"
                  value={serviceDueDate}
                  onChange={(e) => setServiceDueDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all shadow-sm"
                  required
                />
              </div>
            )}
          </div>

          {/* Engine Oil Reminder Settings */}
          <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-3 mt-1">
            <h4 className="font-headline-md text-headline-md text-primary font-bold">Engine Oil Reminder</h4>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Reminder Type</label>
              <select 
                value={oilReminderType}
                onChange={(e) => setOilReminderType(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2.5 font-body-md text-body-md text-on-surface focus:border-primary-container outline-none shadow-sm"
              >
                <option value="odometer">Odometer-based (Distance)</option>
                <option value="date">Date-based (Time)</option>
                <option value="both">Both (Whichever is earlier)</option>
                <option value="none">No Reminder</option>
              </select>
            </div>

            {(oilReminderType === 'odometer' || oilReminderType === 'both') && (
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Next Oil Change Due Odometer ({unit})</label>
                <input 
                  type="number"
                  placeholder={`e.g. ${unit === 'mi' ? '11000' : '18000'}`}
                  value={oilDueOdometer}
                  onChange={(e) => setOilDueOdometer(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
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
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all shadow-sm"
                  required
                />
              </div>
            )}
          </div>

          {errorMsg && <p className="text-error font-label-sm text-label-sm px-1 mt-1">{errorMsg}</p>}

          {/* Confirm Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(26,60,110,0.10)] mt-4 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registering vehicle...
              </>
            ) : (
              <>
                Confirm and Add Vehicle
                <span className="material-symbols-outlined">check_circle</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default AddVehicleStep2;
