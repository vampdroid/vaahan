import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import fetchVehicleDetails from '../services/vahan';
import TopAppBar from '../components/TopAppBar';

export function AddVehicleStep1() {
  const navigate = useNavigate();
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle registration number input (space-free, uppercase, alphanumeric)
  const handleRegInputChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    setRegNumber(val);
    setErrorMsg('');
  };

  const handleFetch = async () => {
    const rawPlate = regNumber.trim();
    // Enforce Indian license plate standard format: e.g. GJ01VA1873
    const regPattern = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    if (!regPattern.test(rawPlate)) {
      setErrorMsg("Please enter a valid registration number (e.g. GJ01VA1873).");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchVehicleDetails(rawPlate);
      if (res.success && res.data) {
        // Save temporary vehicle details to session storage for Step 2
        sessionStorage.setItem('temp_vehicle_fetch', JSON.stringify({
          ...res.data,
          registration_number: rawPlate
        }));
        navigate('/vehicles/add/step2?fetched=true');
      } else {
        setErrorMsg(res.error || "Could not fetch registration details. Please add details manually.");
      }
    } catch (err) {
      setErrorMsg("Connection issue. Please add details manually or try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManually = () => {
    sessionStorage.removeItem('temp_vehicle_fetch');
    navigate('/vehicles/add/step2?fetched=false');
  };

  return (
    <div className="bg-background text-on-background w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="Add Vehicle" 
        subtitle="Step 1 of 2" 
        showBack={true} 
      />

      <main className="flex-1 px-container-margin py-stack-gap-lg flex flex-col gap-stack-gap-lg">
        {/* Hero Section */}
        <section className="flex flex-col gap-stack-gap-sm">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold">
            Enter your registration number
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            We'll securely fetch your vehicle details directly from the RTO database to save you time.
          </p>
        </section>

        {/* Input Area */}
        <section className="flex flex-col gap-stack-gap-md mt-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 transition-all duration-200 focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary-container/10 shadow-ambient-lvl1">
            <label className="block font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider font-semibold" htmlFor="reg-number">
              Registration Number
            </label>
            <input 
              autocomplete="off" 
              className="w-full bg-transparent border-none p-0 font-headline-md text-headline-md text-on-surface uppercase placeholder-outline-variant focus:ring-0 outline-none font-bold" 
              id="reg-number" 
              placeholder="GJ01VA1873" 
              type="text"
              value={regNumber}
              onChange={handleRegInputChange}
              disabled={loading}
            />
          </div>

          {errorMsg && <p className="text-error font-label-sm text-label-sm px-1">{errorMsg}</p>}

          {/* Primary Action */}
          <button 
            onClick={handleFetch}
            disabled={loading}
            className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(26,60,110,0.10)] mt-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Fetching RTO Details...
              </>
            ) : (
              <>
                Fetch Details
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-outline-variant flex-1"></div>
          <span className="font-label-sm text-label-sm text-outline font-semibold">OR</span>
          <div className="h-px bg-outline-variant flex-1"></div>
        </div>

        {/* Secondary Action */}
        <button 
          onClick={handleAddManually}
          disabled={loading}
          className="w-full bg-transparent border border-outline hover:border-primary-container text-primary-container font-label-lg text-label-lg py-3 rounded-xl flex items-center justify-center font-bold transition-colors active:scale-95 disabled:opacity-50"
        >
          Add manually instead
        </button>

        {/* Info Security Card */}
        <div className="mt-auto mb-4 bg-surface-container-low border-l-4 border-primary-container rounded-r-lg p-4 flex gap-3 items-start shadow-ambient-lvl1">
          <span className="material-symbols-outlined text-primary-container filled">security</span>
          <div>
            <h4 className="font-label-sm text-label-sm font-bold text-primary-container mb-1">RTO Data Security</h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              Your vehicle information is fetched securely and is never shared with third parties without your consent.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AddVehicleStep1;
