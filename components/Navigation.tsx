import { Leaf, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const Navigation = ({ onLoginClick, isLoggedIn, onLogout }: NavigationProps) => {
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

          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Demo User</span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button onClick={onLoginClick} variant="default">
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;