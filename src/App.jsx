import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import VehicleList from './views/VehicleList';
import VehicleDetail from './views/VehicleDetail';
import AddVehicleStep1 from './views/AddVehicleStep1';
import AddVehicleStep2 from './views/AddVehicleStep2';
import ServiceHistory from './views/ServiceHistory';
import OilHistory from './views/OilHistory';
import PUCHistory from './views/PUCHistory';
import MileageSessions from './views/MileageSessions';
import DocumentVault from './views/DocumentVault';
import Reminders from './views/Reminders';
import Profile from './views/Profile';
import OdometerHistory from './views/OdometerHistory';

export function App() {
  return (
    <HashRouter>
      <div className="w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col bg-surface overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vehicles" element={<VehicleList />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/vehicles/add/step1" element={<AddVehicleStep1 />} />
          <Route path="/vehicles/add/step2" element={<AddVehicleStep2 />} />
          <Route path="/vehicles/:id/service" element={<ServiceHistory />} />
          <Route path="/vehicles/:id/oil" element={<OilHistory />} />
          <Route path="/vehicles/:id/puc-history" element={<PUCHistory />} />
          <Route path="/vehicles/:id/mileage" element={<MileageSessions />} />
          <Route path="/vehicles/:id/documents" element={<DocumentVault />} />
          <Route path="/vehicles/:id/odometer-logs" element={<OdometerHistory />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
