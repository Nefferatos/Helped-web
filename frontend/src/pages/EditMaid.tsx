import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AddMaid from "@/pages/AddMaid";

const EditMaid = () => {
  const navigate = useNavigate();
  const { refCode } = useParams();

  if (!refCode) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground">Missing maid reference code.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-container pb-0">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
      <AddMaid editRefCode={refCode} />
    </div>
  );
};

export default EditMaid;

