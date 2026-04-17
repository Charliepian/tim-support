import { forwardRef } from "react";

type Variant = "solid" | "outline" | "outline-white" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
  as?: "button" | "a";
  href?: string;
}

const base =
  "inline-flex items-center justify-center font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  // Rouge plein — action principale
  solid:
    "bg-btn text-white hover:opacity-80 focus-visible:ring-btn",

  // Contour rouge — action secondaire
  outline:
    "bg-white border border-btn text-btn hover:opacity-80 focus-visible:ring-btn",

  // Contour neutre — action tertiaire
  "outline-white":
    "bg-white border border-border text-foreground hover:bg-surface focus-visible:ring-border",

  // Fantôme — lien discret
  ghost:
    "bg-transparent text-btn hover:bg-btn-light focus-visible:ring-btn",
};

const sizes: Record<Size, string> = {
  sm: "h-8  px-4  text-xs  gap-1.5",
  md: "h-10 px-6  text-sm  gap-2",
  lg: "h-12 px-8  text-base gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "solid", size = "md", loading = false, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          base,
          variants[variant],
          sizes[size],
          "rounded-[var(--radius-btn)]",
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
