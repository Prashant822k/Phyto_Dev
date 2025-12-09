import { Leaf, User, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface NavigationProps {
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
  onRegisterClick?: () => void;
}

const Navigation = ({ onLoginClick, isLoggedIn, onLogout, onRegisterClick }: NavigationProps) => {
  return (
    <header className="bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">PhytoMaps</h1>
              <p className="text-xs text-muted-foreground">FARMING WITH FORESIGHT</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-foreground hover:text-primary transition-colors">Home</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">Services</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">About</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">Contact</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">Blog</a>
          </nav>

          <div className="flex items-center space-x-3">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Demo User</span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={onRegisterClick} className="hidden sm:flex">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </Button>
                <Link to="/login-client">
                  <Button variant="default">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;