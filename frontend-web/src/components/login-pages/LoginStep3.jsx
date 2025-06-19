import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";

const LoginStep3 = () => {
  const navigate = useNavigate();
  const handleSave = () => {
    navigate("/day-view");
  };
  return (
    <div className="initial-container">
      <div className="mb-10">
        <div className="text-xl mb-10">Sign up for Progress Bars</div>
      </div>
      <div className="">Set Calendar Preferences</div>
      <div className="m-3 flex flex-col gap-3 mx-auto">
        <Button onClick={handleSave} className="mx-auto p-2 max-w-1/3">
          Finish
        </Button>
      </div>
    </div>
  );
};

export default LoginStep3;
