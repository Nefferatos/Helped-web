import { Button } from "@/components/ui/button";
import { signInWithFacebook, signInWithGoogle } from "@/lib/supabaseAuth";
import { toast } from "@/components/ui/sonner";

type Props = {
  disabled?: boolean;
};

const SocialOAuthButtons = ({ disabled }: Props) => {
  const onGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    }
  };

  const onFacebook = async () => {
    try {
      await signInWithFacebook();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Facebook sign-in failed");
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="lg" className="w-full font-body" onClick={() => void onGoogle()} disabled={disabled}>
        Continue with Google
      </Button>
      <Button type="button" variant="outline" size="lg" className="w-full font-body" onClick={() => void onFacebook()} disabled={disabled}>
        Continue with Facebook
      </Button>
    </div>
  );
};

export default SocialOAuthButtons;

