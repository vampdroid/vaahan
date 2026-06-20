import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { name: 'Home', icon: 'dashboard', path: '/dashboard' },
    { name: 'Vehicles', icon: 'directions_car', path: '/vehicles' },
    { name: 'Reminders', icon: 'notifications', path: '/reminders' },
    { name: 'Profile', icon: 'person', path: '/profile' }
  ];

  return (
    <nav className="bg-surface dark:bg-on-background fixed bottom-0 w-full max-w-[768px] left-1/2 -translate-x-1/2 z-50 border-t border-outline-variant/20 shadow-[0_-4px_12px_rgba(26,60,110,0.05)] flex justify-around items-center h-16 px-2 pb-safe">
      {tabs.map((tab) => {
        // Match base path for active states (e.g. /vehicles/:id matches /vehicles tab)
        const isActive = tab.path === '/dashboard' 
          ? currentPath === '/dashboard'
          : currentPath.startsWith(tab.path);
          
        return (
          <button
            key={tab.name}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center w-full h-full hover:bg-surface-container-low transition-colors active:scale-90 ${
              isActive 
                ? 'text-primary dark:text-primary-fixed font-bold' 
                : 'text-on-surface-variant dark:text-outline'
            }`}
          >
            <span className={`material-symbols-outlined mb-1 ${isActive ? 'icon-fill' : ''}`} data-icon={tab.icon}>
              {tab.icon}
            </span>
            <span className="font-label-sm text-label-sm">{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNavBar;
