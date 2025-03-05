import React from "react";
import "firebase/auth";
import { useAuthContext } from "../hooks/useAuth";

const Login = () => {
  const { isSignedIn, handleGoogleSignIn, handleSignOut } = useAuthContext();
  return (
    <div className="bg-[#f2f5f4] bg-cover bg-center w-screen min-h-screen m-0 flex flex-col items-start pt-10 pl-1 sm:pt-12 sm:pl-20 px-4 sm:px-20">
      Do More with Progress Bars Personal Assistant
      <p> • Manage time with values & goals </p>
      <p> • Intelligent event categorization </p>
      <p> • Sync daily journals </p>
      {!isSignedIn ? (
        <button
          onClick={handleGoogleSignIn}
          className="ml-5 mt-6 p-3 text-gray rounded-full rounded-full shadow-lg focus:outline-none hover:border-2"
        >
          Sign In with Google
        </button>
      ) : (
        <button
          onClick={handleSignOut}
          className="ml-5 mt-6 p-3 text-gray rounded-full rounded-full shadow-lg focus:outline-none hover:border-2"
        >
          Sign Out
        </button>
      )}
    </div>
  );
};

export default Login;
