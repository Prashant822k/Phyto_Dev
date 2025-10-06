import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-agricultural.jpg";

interface HeroSectionProps {
  onGetStarted?: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-hero/80" />
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-4xl md:text-6xl font-bold text-hero-foreground mb-6">
          One Platform.{" "}
          <span className="block">Endless Plant Insights.</span>
        </h1>
        
        <div className="mb-8 max-w-2xl mx-auto">
          <p className="text-xl md:text-2xl text-hero-foreground/90 mb-4">
            Manage Golf courses like never before,
            <br />
            Phytomaps provides clarity from above.
          </p>
          
          <div className="bg-hero-foreground/10 backdrop-blur-sm rounded-lg p-6 border border-hero-foreground/20">
            <blockquote className="text-lg md:text-xl font-medium text-hero-foreground italic">
              "Interact with your turf, work your way up"
            </blockquote>
          </div>
        </div>
        
        <Button 
          size="lg" 
          onClick={onGetStarted}
          className="bg-hero-foreground text-hero hover:bg-hero-foreground/90 px-8 py-6 text-lg"
        >
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;