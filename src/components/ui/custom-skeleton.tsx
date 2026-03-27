import { cn } from "@/lib/utils";

/* ─── Keyframes (injected once) ─────────────────────────────────────
   The diagonal sweep cannot be done with pure Tailwind utilities
   because it needs a background-position animation on a gradient.
   Everything else is Tailwind v4 token-based classes.              */
const SWEEP_KEYFRAMES = `
  @keyframes skeleton-sweep {
    0%   { background-position: -400px 0; }
    100% { background-position:  600px 0; }
  }
  .skeleton-sweep {
    background-image: linear-gradient(
      115deg,
      var(--color-muted)          0%,
      var(--color-muted)         35%,
      color-mix(in oklch, var(--color-primary) 14%, var(--color-muted)) 50%,
      var(--color-muted)         65%,
      var(--color-muted)        100%
    );
    background-size: 800px 100%;
    animation: skeleton-sweep 1.6s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton-sweep { animation: none; }
  }
`;

function InjectKeyframes() {
	if (
		typeof document !== "undefined" &&
		document.getElementById("skeleton-sweep-styles")
	) {
		return null;
	}
	return (
		<style
			id="skeleton-sweep-styles"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: <>
			dangerouslySetInnerHTML={{ __html: SWEEP_KEYFRAMES }}
		/>
	);
}
/* ─── Base primitive ─────────────────────────────────────────────── */
interface SkeletonBaseProps extends React.HTMLAttributes<HTMLOutputElement> {
	animate?: boolean;
}

export function SkeletonBase({
	className,
	animate = true,
	...props
}: SkeletonBaseProps) {
	return (
		<>
			<InjectKeyframes />
			<output
				// role="status"
				aria-busy="true"
				aria-label="Loading"
				className={cn(
					"rounded-sm shrink-0",
					animate ? "skeleton-sweep" : "bg-muted",
					className,
				)}
				{...props}
			/>
		</>
	);
}
