import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { getUserFacingError, logTechnicalError } from "@/lib/userFacingErrors";

type ToasterProps = React.ComponentProps<typeof Sonner>;
type ToastFunction = typeof sonnerToast;
type ToastErrorOptions = Parameters<typeof sonnerToast.error>[1];

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:w-[calc(100vw-2rem)] group-[.toaster]:max-w-md",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

const actionForError = (actionLabel: string) => {
  if (actionLabel === "Refresh" || actionLabel === "Retry" || actionLabel === "Try Again") {
    return {
      label: actionLabel,
      onClick: () => window.location.reload(),
    };
  }

  if (actionLabel === "Go Back") {
    return {
      label: actionLabel,
      onClick: () => window.history.back(),
    };
  }

  if (actionLabel === "Contact Support") {
    return {
      label: actionLabel,
      onClick: () => {
        window.location.href = "mailto:enquiries.j1@gmail.com";
      },
    };
  }

  return undefined;
};

const toast = Object.assign(sonnerToast.bind(null), sonnerToast, {
  error: (message?: Parameters<typeof sonnerToast.error>[0], options?: ToastErrorOptions) => {
    const userError = getUserFacingError(message);
    logTechnicalError("user-facing-toast", message);

    return sonnerToast.error(
      <span className="flex min-w-0 items-center gap-2">
        <span className="shrink-0">{userError.icon}</span>
        <span className="min-w-0 font-medium">{userError.title}</span>
      </span>,
      {
        closeButton: true,
        ...options,
        description: userError.description,
        action: options?.action ?? actionForError(userError.actionLabel),
      },
    );
  },
}) as ToastFunction;

export { Toaster, toast };
