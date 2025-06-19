import { useAuthContext } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";

const LoginStep0 = ({ onNext }) => {
  const { handleGoogleSignIn } = useAuthContext();
  const navigate = useNavigate();

  const handleSignedIn = async () => {
    const success = await handleGoogleSignIn();
    if (success === true) {
      navigate("/day-view");
    }
  };

  return (
    <div className="initial-container">
      <img
        src="../../public/tab-icon.svg"
        alt="Icon"
        className="w-8 h-8 mx-auto mb-5"
      />
      <div className="text-2xl mb-10">Personal Time Viewer</div>

      <div className="mb-10">
        <p>
          See where time is going using your defined categories and thresholds
        </p>
        <p>Sync calendar events for ai categorization and visualization</p>
      </div>
      <div className="m-3 flex flex-col gap-3 w-1/3 mx-auto">
        <Button onClick={onNext}>Create account</Button>
        <Button onClick={handleSignedIn}>Sign in</Button>
      </div>
    </div>
  );
};

export default LoginStep0;
