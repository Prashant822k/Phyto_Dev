import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { supabase } from "./lib/supabase";

const queryClient = new QueryClient();

// Wrapper component for Dashboard that has access to router context
const DashboardWrapper = () => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      console.log('User signed out successfully');
      navigate('/');
    }
  };
  
  return <Dashboard onLogout={handleLogout} />;
};

const App = () => {
  useEffect(() => {
    // Ensure user is authenticated on app load
    const initializeAuth = async () => {
      try {
        // Check if we have an existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('No active session, creating anonymous session');
          // Create an anonymous session for development/testing
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@test.com',
            password: 'demo123',
          });
          
          if (error) {
            console.log('Trying to sign up instead');
            // Try to sign up if sign in fails
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: 'test@test.com',
              password: 'demo123',
            });
            
            if (signUpError) {
              console.error('Authentication failed:', signUpError);
            } else {
              console.log('Demo user created successfully');
            }
          } else {
            console.log('Demo user signed in successfully');
          }
        } else {
          console.log('User already authenticated');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };
    
    initializeAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
