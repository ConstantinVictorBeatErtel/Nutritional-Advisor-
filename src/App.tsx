/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import Coach from './screens/Coach';
import LogMeal from './screens/LogMeal';
import {
  loadLoggedMeals,
  saveLoggedMeals,
  filterMealsForLocalDate,
  todayLocalDateKey,
  removeMealById,
  MAX_LOGGED_MEALS,
  type LoggedMeal,
} from './lib/meal-log';
import {
  calculateNutritionTargets,
  loadUserProfile,
  saveUserProfile,
  type UserProfile,
} from './lib/profile';

type Screen = 'onboarding' | 'dashboard' | 'logs' | 'coach';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const savedProfile = loadUserProfile();
    return savedProfile?.name?.trim() ? 'dashboard' : 'onboarding';
  });
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>(() => loadLoggedMeals());
  const nutritionTargets = useMemo(() => (profile ? calculateNutritionTargets(profile) : null), [profile]);
  const mealsToday = useMemo(
    () => filterMealsForLocalDate(loggedMeals, todayLocalDateKey()),
    [loggedMeals],
  );

  useEffect(() => {
    saveLoggedMeals(loggedMeals);
  }, [loggedMeals]);

  useEffect(() => {
    if (profile) {
      saveUserProfile(profile);
    }
  }, [profile]);

  const handleMealLogged = (meal: LoggedMeal) => {
    setLoggedMeals((currentMeals) => [meal, ...currentMeals].slice(0, MAX_LOGGED_MEALS));
    setCurrentScreen('dashboard');
  };

  const handleRemoveMeal = (mealId: string) => {
    setLoggedMeals((currentMeals) => removeMealById(currentMeals, mealId));
  };

  const handleProfileSaved = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setCurrentScreen('dashboard');
  };

  const renderScreen = () => {
    if (!profile || !nutritionTargets) {
      return <Onboarding initialProfile={profile} onComplete={handleProfileSaved} />;
    }

    switch (currentScreen) {
      case 'onboarding':
        return <Onboarding initialProfile={profile} onComplete={handleProfileSaved} />;
      case 'dashboard':
        return (
          <Dashboard
            meals={mealsToday}
            profile={profile}
            nutritionTargets={nutritionTargets}
            onLogMeal={() => setCurrentScreen('logs')}
            onEditProfile={() => setCurrentScreen('onboarding')}
            onRemoveMeal={handleRemoveMeal}
          />
        );
      case 'logs':
        return <LogMeal onComplete={() => setCurrentScreen('dashboard')} onMealLogged={handleMealLogged} />;
      case 'coach':
        return (
          <Coach
            meals={mealsToday}
            profile={profile}
            nutritionTargets={nutritionTargets}
            onRemoveMeal={handleRemoveMeal}
          />
        );
      default:
        return (
          <Dashboard
            meals={mealsToday}
            profile={profile}
            nutritionTargets={nutritionTargets}
            onLogMeal={() => setCurrentScreen('logs')}
            onEditProfile={() => setCurrentScreen('onboarding')}
            onRemoveMeal={handleRemoveMeal}
          />
        );
    }
  };

  const getTitle = () => {
    switch (currentScreen) {
      case 'dashboard':
        return 'Daily Targets';
      case 'logs':
        return 'Log Meal';
      case 'coach':
        return 'Daily Coach';
      case 'onboarding':
        return 'Profile';
      default:
        return '';
    }
  };

  if (!profile || !profile.name.trim() || currentScreen === 'onboarding') {
    return <Onboarding initialProfile={profile} onComplete={handleProfileSaved} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeTab={currentScreen}
        setActiveTab={(tab) => setCurrentScreen(tab as Screen)}
        userName={profile.name}
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto hide-scrollbar">
        <TopBar
          title={getTitle()}
          userName={profile.name}
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
