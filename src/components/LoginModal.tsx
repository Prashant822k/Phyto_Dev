import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const LoginModal = ({ isOpen, onClose, onLogin }: LoginModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Use Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      onLogin();
      onClose();
      toast({
        title: "Login Successful",
        description: "Welcome to PhytoMaps Dashboard!",
      });
    } catch (error) {
      console.error("Login error:", error);
      // Fallback to demo login for development
      if (email === "demo@phytomaps.com" && password === "demo123") {
        // Create a demo session
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (!error) {
          onLogin();
          onClose();
          toast({
            title: "Demo Login Successful",
            description: "Welcome to PhytoMaps Dashboard (Demo Mode)!",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message || "Authentication failed",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Try demo@phytomaps.com / demo123",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Registration Failed",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Registration Failed",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Register user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined // Disable email confirmation redirect
        }
      });

      if (error) throw error;

      toast({
        title: "Registration Successful",
        description: "User created successfully! You can now log in.",
      });

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create user account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PhytoMaps Authentication</DialogTitle>
          <DialogDescription>
            Access your agricultural insights dashboard
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <Card className="p-4 bg-muted">
              <p className="text-sm text-muted-foreground">
                <strong>Demo Credentials:</strong><br />
                Email: demo@phytomaps.com<br />
                Password: demo123
              </p>
            </Card>
            
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Full Name</Label>
              <Input
                id="register-name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Enter your password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRegister} disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Register User"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;