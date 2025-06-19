import React from "react";
import "firebase/auth";
import { useState } from "react";

import LoginStep0 from "@/components/login-pages/LoginStep0";
import LoginStep1 from "@/components/login-pages/LoginStep1";
import LoginStep2 from "@/components/login-pages/LoginStep2";
import LoginStep3 from "@/components/login-pages/LoginStep3";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  p-10 sm:pt-30 sm:pl-20 text-white
  flex flex-col
`;

const Login = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNextStep = () => {
    setCurrentStep((prevStep) => prevStep + 1);
  };

  return (
    <div className={`${baseContainerClasses} `}>
      <div className="login-container">
        {currentStep === 0 && (
          <div className="initial-container">
            <LoginStep0 onNext={handleNextStep} />
          </div>
        )}
        {currentStep === 1 && (
          <div className="login-container">
            <div className="text-sm">Step 1 of 3</div>
            <LoginStep1 onNext={handleNextStep} />
          </div>
        )}
        {currentStep === 2 && (
          <div className="login-container">
            <div className="text-sm">Step 2 of 3</div>
            <LoginStep2 onNext={handleNextStep} />
          </div>
        )}
        {currentStep === 3 && (
          <div className="login-container">
            <div className="text-sm">Step 3 of 3</div>
            <LoginStep3 />
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
