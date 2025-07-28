import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { deleteAccount } from "@/api/account";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DeleteAccountButton = ({ handleLogoutAccount }) => {
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    try {
      const deleteResponse = await deleteAccount();
      handleLogoutAccount().catch((e) =>
        console.log("Auth - logout failure", e)
      );
      if (deleteResponse.success) {
        navigate("/login");
      }
    } catch (error) {
      console.log("Account - deletion failed");
    }
  };

  return (
    <div className="flex items-center gap-3 pl-8">
      <span className="text-gray-300 text-sm sm:text-base font-lexend">
        Delete Account
      </span>
      <Dialog>
        <form>
          <DialogTrigger asChild>
            <Button variant="default">
              <TrashIcon className="text-white" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription className="text-gray-700">
                Your account and data will be deleted. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button onClick={handleDeleteAccount}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
    </div>
  );
};

export default DeleteAccountButton;
