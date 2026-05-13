import { Button } from "@/components/ui/button";
import { signInWithFacebook, signInWithGoogle } from "@/lib/supabaseAuth";
import { toast } from "@/components/ui/sonner";

type Props = {
  disabled?: boolean;
  enableFacebook?: boolean;
  redirectTo?: string;
};

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" fill="#1877F2" />
  </svg>
);

const SocialOAuthButtons = ({ disabled, enableFacebook = false, redirectTo }: Props) => {
  const onGoogle = async () => {
    try {
      await signInWithGoogle(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    }
  };

  const onFacebook = async () => {
    try {
      await signInWithFacebook(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Facebook sign-in failed");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full font-body gap-2"
        onClick={() => void onGoogle()}
        disabled={disabled}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      {/* {enableFacebook && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full font-body gap-2"
          onClick={() => void onFacebook()}
          disabled={disabled}
        >
          <FacebookIcon />
          Continue with Facebook
        </Button>
      )} */}
    </div>
  );
};

export default SocialOAuthButtons;
