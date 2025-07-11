import { useAuthContext } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button.jsx";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const LoginStep1 = ({ onNext }) => {
  const { isSignedIn, handleGoogleSignIn } = useAuthContext();

  // useEffect(() => {
  //   console.log("isSignedIn", isSignedIn);
  //   if (isSignedIn === true) {
  //     // onNext();
  //   }
  // }, [isSignedIn, onNext]);

  const handleSignedIn = async () => {
    const success = await handleGoogleSignIn();
    if (success === true) {
      console.log("onNext();");
      onNext();
    }
  };

  return (
    <div className="initial-container">
      <div className="mb-10">
        <div className="text-xl mb-10">Sign up for Progress Bars</div>
        <p>
          By creating an account you agree to the{" "}
          <Link
            to="/about/terms-of-service"
            className="text-blue-200 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/about/privacy" className="text-blue-200 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
      <div className="m-3 flex flex-col gap-3 mx-auto">
        <Button
          onClick={handleSignedIn}
          className="mx-auto p-2 sm:max-w-1/2 md:max-w-1/3"
        >
          Continue with Google Calendar
        </Button>
      </div>
    </div>
  );
};

export default LoginStep1;
