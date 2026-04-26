import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MaidProfile } from "@/lib/maids";
import { hasActiveClientSession } from "@/lib/supabaseAuth";

interface Props {
  maid: MaidProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HireConfirmationDialog = ({ maid, open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const handleAccept = async () => {
    if (maid?.referenceCode) {
      if (!(await hasActiveClientSession())) {
        navigate("/employer-login");
      } else {
        navigate(`/hire/${encodeURIComponent(maid.referenceCode)}`);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Accept Decision</DialogTitle>
          <DialogDescription>
            Are you sure you want to proceed with accepting <strong>{maid?.fullName}</strong> ({maid?.referenceCode})?
            <br />
            This will move you to the hiring process where you'll provide schedule, address, and terms details.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleAccept()}>Accept and Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireConfirmationDialog;

