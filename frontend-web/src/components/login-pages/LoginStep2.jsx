import { Button } from "@/components/ui/button.jsx";

const LoginStep2 = ({ onNext }) => {
  const handleSave = () => {
    onNext();
  };
  return (
    <div className="initial-container">
      <div className="mb-10">
        <div className="text-xl mb-10">Sign up for Progress Bars</div>
      </div>
      <div className="">Define any initial categories for visualizing</div>
      <div className="">Make edits later in Settings</div>

      <div className="m-3 flex flex-col gap-3 mx-auto">
        <Button onClick={handleSave} className="mx-auto p-2 max-w-1/3">
          Save & Continue
        </Button>
      </div>
    </div>
  );
};

export default LoginStep2;
