import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StepOne, StepTwo } from "@/features/onboarding";
import logo from "@/assets/daft-funk-logo.png";

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const handleStepOneComplete = () => {
    setCurrentStep(2);
  };

  const handleStepTwoComplete = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-8">
            <img src={logo} alt="Daft Funk" className="h-12 w-12" />
            <span className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Daft Funk
            </span>
          </div>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-gold' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${currentStep >= 1 ? 'border-gold bg-gold/20' : 'border-border'}`}>
                1
              </div>
              <span className="text-sm font-medium">Informations</span>
            </div>
            <div className={`h-0.5 w-16 ${currentStep >= 2 ? 'bg-gold' : 'bg-border'}`} />
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-gold' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${currentStep >= 2 ? 'border-gold bg-gold/20' : 'border-border'}`}>
                2
              </div>
              <span className="text-sm font-medium">Google Drive</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-subtle">
          {currentStep === 1 && <StepOne onComplete={handleStepOneComplete} />}
          {currentStep === 2 && <StepTwo onComplete={handleStepTwoComplete} />}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
