import React from "react";
import "firebase/auth";
import { useAuthContext } from "../hooks/useAuth";
import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import LoginStep1 from "@/components/login-pages/LoginStep1";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  p-10 sm:pt-30 sm:pl-20 text-white
  flex flex-col
`;

const Login = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const { isSignedIn, handleGoogleSignIn, handleSignOut } = useAuthContext();
  return (
    <div className={`${baseContainerClasses} `}>
      <div className="login-container">
        {currentStep === 1 && (
          <div className="initial-container">
            <LoginStep1 />
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
