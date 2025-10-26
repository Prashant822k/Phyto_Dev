import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { supabase } from "./lib/supabase";
import LoginAdmin from "./pages/LoginAdmin";
import LoginClient from "./pages/LoginClient";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardClient from "./pages/DashboardClient";
import RegisterClient from "./pages/RegisterClient";
import ForgotPassword from "./pages/ForgotPassword";

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

function RequireRole({ role, children }: { role: 'admin' | 'client'; children: JSX.Element }) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
          setAllowed(false); 
          setLoading(false);
          return; 
        }
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
        setAllowed(!!data && data.role === role);
      } catch (error) {
        console.error('Role check error:', error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!allowed) {
    return <Navigate to={role === 'admin' ? '/login-admin' : '/login-client'} replace />;
  }
  
  return children;
}

const App = () => {
  // Removed demo auto sign-in so users always land on the login screen
  useEffect(() => {}, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login-client" replace />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/login-admin" element={<LoginAdmin />} />
            <Route path="/login-client" element={<LoginClient />} />
            <Route path="/register" element={<RegisterClient />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin" element={<RequireRole role="admin"><DashboardAdmin /></RequireRole>} />
            <Route path="/client" element={<RequireRole role="client"><DashboardClient /></RequireRole>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
