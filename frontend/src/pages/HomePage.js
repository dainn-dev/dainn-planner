import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import Hero from '../components/Hero';
import SmartScheduling from '../components/SmartScheduling';
import GoalBreakdown from '../components/GoalBreakdown';
import FocusMode from '../components/FocusMode';
import AdditionalFeatures from '../components/AdditionalFeatures';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Get user role to determine redirect
      try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (user && user.role === 'Admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/daily', { replace: true });
        }
      } catch (error) {
        // If error parsing user, redirect to daily page
        navigate('/daily', { replace: true });
      }
    }
  }, [navigate]);

  return (
    <div className="bg-background-light font-display text-gray-900 overflow-x-hidden">
      <PublicHeader />
      <main className="flex flex-col items-center">
        <Hero />
        <SmartScheduling />
        <GoalBreakdown />
        <FocusMode />
        <AdditionalFeatures />
        <CTA />
        <Footer />
      </main>
    </div>
  );
};

export default HomePage;

