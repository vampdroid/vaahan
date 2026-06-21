import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../services/supabase';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Helper to load vehicles, compute driven averages, and sort
  const refreshVehicles = async () => {
    try {
      const { data: vehiclesData, error: vError } = await supabase
        .from('vehicles')
        .select('*');
      if (vError) throw vError;

      // Fetch odometer logs to calculate actual usage averages
      const { data: logsData, error: lError } = await supabase
        .from('odometer_logs')
        .select('*');

      const allLogs = logsData || [];

      const processedVehicles = (vehiclesData || []).map(v => {
        const vehicleLogs = allLogs.filter(log => log.vehicle_id === v.id);
        
        let actualDaily = null;
        let actualWeekly = null;
        
        if (vehicleLogs.length >= 2) {
          // Sort chronologically ascending
          const sortedLogs = [...vehicleLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
          const earliest = sortedLogs[0];
          const latest = sortedLogs[sortedLogs.length - 1];
          
          const timeDiff = new Date(latest.logged_at) - new Date(earliest.logged_at);
          const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 1) {
            const kmDiff = latest.value - earliest.value;
            actualDaily = kmDiff / daysDiff;
            actualWeekly = actualDaily * 7;
          }
        }
        
        // Determine active usage metric for sorting (weekly kms)
        // Fallback priority: actual weekly average -> estimated weekly usage -> estimated daily usage * 7 -> 0
        const usageMetric = actualWeekly !== null 
          ? actualWeekly 
          : (v.est_weekly_km ? parseFloat(v.est_weekly_km) : (v.est_daily_km ? parseFloat(v.est_daily_km) * 7 : 0));

        return {
          ...v,
          actual_daily_km: actualDaily,
          actual_weekly_km: actualWeekly,
          usage_metric: usageMetric
        };
      });

      // Sort vehicles by usage_metric in descending order
      processedVehicles.sort((a, b) => b.usage_metric - a.usage_metric);

      setVehicles(processedVehicles);
    } catch (err) {
      console.error('Error refreshing vehicles in context:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Helper to load user profile
  const refreshProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user';

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (error) throw error;
      if (data && data.length > 0) {
        setProfile(data[0]);
      } else {
        const mockP = {
          full_name: session?.user?.user_metadata?.full_name || 'Yash Kukreja',
          email: session?.user?.email || 'yash.k@example.com',
          phone: session?.user?.phone || '+91 98765 43210'
        };
        setProfile(mockP);
      }
    } catch (err) {
      console.error('Error refreshing profile in context:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    refreshVehicles();
    refreshProfile();
  }, []);

  return (
    <AppContext.Provider value={{
      vehicles,
      profile,
      loadingVehicles,
      loadingProfile,
      refreshVehicles,
      refreshProfile,
      setVehicles,
      setProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
