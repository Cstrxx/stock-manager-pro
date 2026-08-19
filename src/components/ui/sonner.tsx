import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster do ESTOQ. Superfície de overlay, hairline, raio de card e a
 * mesma métrica tipográfica do resto da aplicação.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-popover group-[.toaster]:text-foreground",
            "group-[.toaster]:border group-[.toaster]:border-border",
            "group-[.toaster]:rounded-xl group-[.toaster]:shadow-[var(--shadow-overlay)]",
            "group-[.toaster]:text-[13px]",
          ].join(" "),
          title: "group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[12px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          success: "group-[.toaster]:border-primary/25",
          error: "group-[.toaster]:border-destructive/30",
          warning: "group-[.toaster]:border-warning/25",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
