import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import LoginModal from "@/components/LoginModal";
import Dashboard from "./Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, MapPin, ArrowRight } from "lucide-react";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        onLoginClick={() => setShowLogin(true)} 
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
      
      <HeroSection onGetStarted={() => setShowLogin(true)} />
      
      {/* Login Options Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Access Level
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              PhytoMaps provides different access levels for administrators and golf club members. 
              Select the appropriate portal for your role.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Admin Portal Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Administrator Portal</CardTitle>
                <CardDescription>
                  Full access to manage golf clubs, users, and agricultural data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    Upload and manage agricultural data
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    Create and manage golf clubs
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    Assign users to clubs
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    View all processed outputs
                  </li>
                </ul>
                <Link to="/login-admin" className="w-full">
                  <Button className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Login
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Client Portal Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Golf Club Portal</CardTitle>
                <CardDescription>
                  Access your club's agricultural data and analysis results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    View processed agricultural data
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    Access club-specific analysis
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    Secure, role-based access
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-green-600 mr-2" />
                    Read-only data viewing
                  </li>
                </ul>
                <Link to="/login-client" className="w-full">
                  <Button className="w-full" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Club Member Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      <LoginModal 
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={handleLogin}
      />
    </div>
  );
};

export default Index;
