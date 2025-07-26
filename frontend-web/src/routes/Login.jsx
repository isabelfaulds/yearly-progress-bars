import React from "react";
import "firebase/auth";
import { useState } from "react";

import CreateAccountSignIn from "@/components/login-pages/CreateAccountSignIn";
import CreateAccountStep0 from "@/components/login-pages/CreateAccountStep0";
import CreateAccountStep1 from "@/components/login-pages/CreateAccountStep1";
import CreateAccountStep2 from "@/components/login-pages/CreateAccountStep2";
import CreateAccountStep3 from "@/components/login-pages/CreateAccountStep3";

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

  const handlePrevStep = () => {
    setCurrentStep((prevStep) => prevStep - 1);
  };

  return (
    <div className={`${baseContainerClasses} `}>
      <div className="login-container">
        {currentStep === 0 && (
          <div className="initial-container">
            <CreateAccountSignIn onNext={handleNextStep} />
          </div>
        )}
        {currentStep === 1 && (
          <div className="login-container">
            {/* <div className="text-sm">Step 1 of 3</div> */}
            <CreateAccountStep0 onNext={handleNextStep} />
          </div>
        )}
        {currentStep === 2 && (
          <div className="login-container">
            <div className="text-sm">Step 1 of 3</div>
            <CreateAccountStep1 onNext={handleNextStep} />
          </div>
        )}
        {currentStep === 3 && (
          <div className="login-container">
            <div className="text-sm">Step 2 of 3</div>
            <CreateAccountStep2
              onPrev={handlePrevStep}
              onNext={handleNextStep}
            />
          </div>
        )}
        {currentStep === 4 && (
          <div className="login-container">
            <div className="text-sm">Step 3 of 3</div>
            <CreateAccountStep3 onPrev={handlePrevStep} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
