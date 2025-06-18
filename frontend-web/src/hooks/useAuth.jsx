import React, { createContext, useState, useEffect } from "react";
import "firebase/auth";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.email");
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.profile");
googleProvider.addScope("openid");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/tasks.readonly");
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  // accesstoken checker
  const checkLoginCookie = async () => {
    try {
      const authCheckResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_AUTH_CHECK,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (authCheckResponse.status === 200) {
        setIsSignedIn(true);
        return true;
      } else {
        setIsSignedIn(false);
        return false;
      }
    } catch (error) {
      setIsSignedIn(false);
      return false;
    }
  };

  // refresh
  const checkRefreshCookie = async () => {
    const authResponse = await fetch(import.meta.env.VITE_API_GATEWAY_REFRESH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (authResponse.status === 200) {
      setIsSignedIn(true);
      return true;
    } else {
      return false;
    }
  };

  // initial set access token
  useEffect(() => {
    const initializeAuth = async () => {
      const loginCheckSuccess = await checkLoginCookie();
      if (loginCheckSuccess) {
        console.log("Auth - access success");
      }
      if (!loginCheckSuccess) {
        const refreshCheckSuccess = await checkRefreshCookie();
        if (refreshCheckSuccess) {
          ("Auth - refreshed");
        }
      }
    };
    initializeAuth();
  }, []);

  // sign in
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result) {
        const authResponse = await fetch(
          import.meta.env.VITE_API_GATEWAY_USER_TOKEN,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              userID: result.user.email,
              email: result.user.email,
              token: result._tokenResponse.idToken,
              gapiToken: result._tokenResponse.oauthAccessToken,
              refreshToken: result._tokenResponse.refreshToken,
              datetime: new Date().toISOString(),
              expiresIn: result._tokenResponse.expires_in,
            }),
          }
        );
        if (authResponse.status === 200) {
          console.log("auth response result");
          checkLoginCookie();
        } else {
          const errorResponse = await authResponse.text();
          console.error(
            "Auth failed with status:",
            authResponse.status,
            "Response:",
            errorResponse
          );
        }
      }
    } catch (error) {
      console.log("Error signing in:", error);
    }
  };

  // sign out
  const handleSignOut = async () => {
    const authResponse = await fetch(import.meta.env.VITE_API_GATEWAY_LOGOUT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        handleGoogleSignIn,
        handleSignOut,
        checkLoginCookie,
        checkRefreshCookie,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return React.useContext(AuthContext);
}
