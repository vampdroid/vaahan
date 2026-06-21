import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';
import { useApp } from '../context/AppContext';

export function AddVehicleStep2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFetched = searchParams.get('fetched') === 'true';
  const { refreshVehicles } = useApp();

  // State fields
  const [regNumber, setRegNumber] = useState('');
  const [modelName, setModelName] = useState('');
  const [vehicleType, setVehicleType] = useState('scooter'); // 'scooter' | 'car'
  const [nickname, setNickname] = useState('');
  const [odometer, setOdometer] = useState('');
  const [estDailyKm, setEstDailyKm] = useState('');
  const [estWeeklyKm, setEstWeeklyKm] = useState('');
  const [pucExpiryDate, setPucExpiryDate] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [serviceDueOdometer, setServiceDueOdometer] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1a3c6e'); // Deep Blue
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const colors = [
    { name: 'Navy', hex: '#1a3c6e' },
    { name: 'Indigo', hex: '#4546d8' },
    { name: 'Orange', hex: '#E8690B' },
    { name: 'Teal', hex: '#00695C' },
    { name: 'Red', hex: '#ba1a1a' },
    { name: 'Black', hex: '#1b1b24' }
  ];

  useEffect(() => {
    if (isFetched) {
      const fetchedDataStr = sessionStorage.getItem('temp_vehicle_fetch');
      if (fetchedDataStr) {
        try {
          const data = JSON.parse(fetchedDataStr);
          setRegNumber(data.registration_number || '');
          setModelName(data.model_name || '');
          setVehicleType(data.vehicle_type || 'scooter');
          setSelectedColor(data.color || '#1a3c6e');
          if (data.current_odometer) {
            setOdometer(data.current_odometer.toString());
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
  }, [isFetched]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      setErrorMsg("Please provide a valid registration number.");
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

      const newVehicle = {
        user_id: userId,
        registration_number: regNumber.trim().toUpperCase(),
        model_name: modelName,
        vehicle_type: vehicleType,
        nickname: nickname.trim() || modelName,
        current_odometer: parseFloat(odometer),
        color: selectedColor,
        puc_expiry_date: pucExpiryDate || null,
        insurance_expiry_date: insuranceExpiryDate || null,
        service_due_odometer: serviceDueOdometer ? parseFloat(serviceDueOdometer) : null,
        est_daily_km: estDailyKm ? parseFloat(estDailyKm) : 0,
        est_weekly_km: estWeeklyKm ? parseFloat(estWeeklyKm) : 0
      };

      const { data, error } = await supabase.from('vehicles').insert(newVehicle).select();
      if (error) throw error;

      // Seed baseline odometer log
      const insertedVehicle = data ? (Array.isArray(data) ? data[0] : data) : null;
      const createdVehicleId = insertedVehicle?.id;
      if (createdVehicleId) {
        await supabase.from('odometer_logs').insert({
          vehicle_id: createdVehicleId,
          value: parseFloat(odometer),
          logged_at: new Date().toISOString()
        });
      }

      await refreshVehicles();
      
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
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body pb-[80px]">
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
              Make &amp; Model
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
                    ? 'bg-[#131939] text-white border-[#131939] shadow-sm'
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
                    ? 'bg-[#131939] text-white border-[#131939] shadow-sm'
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

          {/* Current Odometer */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Current Odometer (km)
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

          {/* Estimated Daily Usage */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Estimated Daily Usage (km) (Optional)
            </label>
            <input 
              type="number"
              placeholder="e.g. 20"
              value={estDailyKm}
              onChange={(e) => setEstDailyKm(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
            />
          </div>

          {/* Estimated Weekly Usage */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Estimated Weekly Usage (km) (Optional)
            </label>
            <input 
              type="number"
              placeholder="e.g. 120"
              value={estWeeklyKm}
              onChange={(e) => setEstWeeklyKm(e.target.value)}
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

          {/* Next Service Due */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">
              Next Service Due Odometer (km) (Optional)
            </label>
            <input 
              type="number"
              placeholder="e.g. 20000"
              value={serviceDueOdometer}
              onChange={(e) => setServiceDueOdometer(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all placeholder:text-outline shadow-sm"
            />
          </div>

          {/* Color selector */}
          <div className="flex flex-col gap-3">
            <span className="font-label-lg text-label-lg text-on-surface font-bold">Vehicle Paint Color</span>
            <div className="flex gap-4">
              {colors.map((c) => {
                const isSelected = selectedColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className="w-10 h-10 rounded-full border shadow-sm relative transition-transform active:scale-95"
                    style={{ 
                      backgroundColor: c.hex,
                      borderColor: isSelected ? '#131939' : '#c7c5cf',
                      borderWidth: isSelected ? '3px' : '1px',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                    }}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-white text-[20px] absolute inset-0 m-auto flex items-center justify-center">
                        check
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && <p className="text-error font-label-sm text-label-sm px-1 mt-1">{errorMsg}</p>}

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
