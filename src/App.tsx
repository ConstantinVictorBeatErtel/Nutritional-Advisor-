/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import Coach from './screens/Coach';
import LogMeal from './screens/LogMeal';
import { motion, AnimatePresence } from 'motion/react';

type Screen = 'onboarding' | 'dashboard' | 'logs' | 'coach';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'onboarding':
        return <Onboarding onComplete={() => setCurrentScreen('dashboard')} />;
      case 'dashboard':
        return <Dashboard onLogMeal={() => setCurrentScreen('logs')} />;
      case 'logs':
        return <LogMeal onComplete={() => setCurrentScreen('dashboard')} />;
      case 'coach':
        return <Coach />;
      default:
        return <Dashboard onLogMeal={() => setCurrentScreen('logs')} />;
    }
  };

  const getTitle = () => {
    switch (currentScreen) {
      case 'dashboard': return 'Your Daily Vitality';
      case 'logs': return 'Log Your Meal';
      case 'coach': return 'Coach Insights';
      default: return '';
    }
  };

  if (currentScreen === 'onboarding') {
    return <Onboarding onComplete={() => setCurrentScreen('dashboard')} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        activeTab={currentScreen} 
        setActiveTab={(tab) => setCurrentScreen(tab as Screen)} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto hide-scrollbar">
        <TopBar 
          title={getTitle()} 
          showBack={currentScreen === 'logs'}
          onBack={() => setCurrentScreen('dashboard')}
        />
        
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl flex items-center justify-around px-6 z-50 border-t border-zinc-100">
          {[
            { id: 'dashboard', label: 'Home' },
            { id: 'logs', label: 'Logs' },
            { id: 'coach', label: 'Coach' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id as Screen)}
              className={`flex flex-col items-center gap-1 ${currentScreen === item.id ? 'text-primary' : 'text-zinc-400'}`}
            >
              <div className={`w-1 h-1 rounded-full mb-1 ${currentScreen === item.id ? 'bg-primary' : 'bg-transparent'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
