/**
 * Ecclesia CMS — TanStack Router State Components
 * Styled with Tailwind v4 using the project design-system tokens.
 *
 * ── Route-level (renders inside the layout shell) ──────────────────
 *
 *   import { RoutePendingComponent, RouteErrorComponent } from "@/components/route-components"
 *
 *   export const Route = createFileRoute("/finance/receipts")({
 *     component: ReceiptsPage,
 *     pendingComponent: RoutePendingComponent,
 *     errorComponent:   RouteErrorComponent,
 *   })
 *
 * ── Root-level (__root.tsx) ─────────────────────────────────────────
 *
 *   import {
 *     GlobalPendingComponent,
 *     GlobalNotFound,
 *     RouteErrorComponent,
 *   } from "@/components/route-components"
 *
 *   export const Route = createRootRoute({
 *     component:        RootLayout,
 *     pendingComponent: GlobalPendingComponent,
 *     notFoundComponent: GlobalNotFound,
 *     errorComponent:   RouteErrorComponent,
 *   })
 */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <> */

import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Compass,
	Home,
	Layers,
	RefreshCw,
	ServerCrash,
	ShieldAlert,
	WifiOff,
} from "lucide-react";

/* ─── Keyframe animations not expressible as pure Tailwind utilities ─
   Tailwind v4 supports @keyframes in CSS but these are component-
   scoped. We inject them once via a tiny <style> block rather than
   polluting globals.css, keeping the components self-contained.      */
const KEYFRAMES = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: scale(0);   opacity: 0.35; }
    40%           { transform: scale(1);   opacity: 1;    }
  }
  @keyframes progress-fill {
    0%   { width: 0%;   opacity: 1; }
    70%  { width: 85%;  opacity: 1; }
    95%  { width: 92%;  opacity: 1; }
    100% { width: 100%; opacity: 0; }
  }
  @keyframes geo-cw  { to { transform: rotate( 360deg); } }
  @keyframes geo-ccw { to { transform: rotate(-360deg); } }
  @keyframes err-shake {
    0%,100% { transform: translateX(0);    }
    20%     { transform: translateX(-4px); }
    40%     { transform: translateX( 4px); }
    60%     { transform: translateX(-3px); }
    80%     { transform: translateX( 3px); }
  }
  @keyframes float-y {
    0%, 100% { transform: translateY(0);    }
    50%       { transform: translateY(-6px); }
  }
  @keyframes pulse-ring {
    0%,100% { transform: scale(0.88); opacity: 0.75; }
    50%     { transform: scale(1.1);  opacity: 0.3;  }
  }
  .skel {
    background: linear-gradient(90deg,
      var(--color-border) 25%,
      color-mix(in oklch, var(--color-border) 40%, white) 50%,
      var(--color-border) 75%
    );
    background-size: 600px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  .animate-shimmer   { animation: shimmer      1.5s ease-in-out infinite; }
  .animate-dot-1     { animation: dot-bounce   1.2s ease-in-out 0s   infinite; }
  .animate-dot-2     { animation: dot-bounce   1.2s ease-in-out 0.2s infinite; }
  .animate-dot-3     { animation: dot-bounce   1.2s ease-in-out 0.4s infinite; }
  .animate-progress  { animation: progress-fill 2.8s ease-out forwards; }
  .animate-geo-cw-80 { animation: geo-cw  80s linear infinite; }
  .animate-geo-cw-55 { animation: geo-cw  55s linear infinite; }
  .animate-geo-cw-35 { animation: geo-cw  35s linear infinite; }
  .animate-geo-ccw   { animation: geo-ccw 55s linear infinite; }
  .animate-err-shake { animation: err-shake 0.5s ease 0.3s both; }
  .animate-float     { animation: float-y  4s ease-in-out infinite; }
  .animate-pulse-ring{ animation: pulse-ring 2.4s ease-in-out infinite; }
  .animate-spin-logo { animation: geo-cw 1.1s linear infinite; }
`;

let injected = false;
function Keyframes() {
	if (injected) return null;
	injected = true;
	// biome-ignore lint/security/noDangerouslySetInnerHtml: <>
	return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}

/* ─── Skeleton block ─────────────────────────────────────────────── */
function Skel({ className = "" }: { className?: string }) {
	return <div className={`skel rounded-sm ${className}`} />;
}

/* ════════════════════════════════════════════════════════════════════
   1. ROUTE PENDING COMPONENT
   Renders inside the existing layout shell — sidebar stays visible.
   Mirrors the dashboard structure with shimmer skeleton placeholders.
   ════════════════════════════════════════════════════════════════════ */
export function RoutePendingComponent() {
	return (
		<>
			<Keyframes />

			<div className="flex flex-col gap-5 p-6 animate-in fade-in duration-300">
				{/* ── Page header ── */}
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<Skel className="h-5 w-48" />
						<Skel className="h-3 w-72" />
					</div>
					<div className="flex gap-2">
						<Skel className="h-8 w-24 rounded-md" />
						<Skel className="h-8 w-20 rounded-md" />
					</div>
				</div>

				{/* ── KPI cards ── */}
				<div className="grid grid-cols-4 gap-3.5">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="bg-card border border-border rounded-lg overflow-hidden shadow-sm"
						>
							{/* accent bar */}
							<div className="h-[3px] bg-border" />
							<div className="p-4">
								<div className="flex justify-between items-start">
									<div className="flex flex-col gap-2 flex-1">
										<Skel className="h-2.5 w-[55%]" />
										<Skel className="h-6 w-[70%] rounded" />
										<Skel className="h-2.5 w-[50%]" />
									</div>
									<Skel className="size-9 rounded-lg shrink-0" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* ── Charts row ── */}
				<div className="grid grid-cols-[1fr_280px] gap-3.5">
					{/* Area chart card */}
					<div className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Skel className="h-4 w-40" />
							<Skel className="h-3 w-60" />
						</div>
						<Skel className="h-44 w-full rounded-lg" />
					</div>
					{/* Donut card */}
					<div className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Skel className="h-4 w-32" />
							<Skel className="h-3 w-20" />
						</div>
						<Skel className="h-36 w-full rounded-lg" />
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex justify-between">
									<Skel className="h-2.5 w-[45%]" />
									<Skel className="h-2.5 w-[18%]" />
								</div>
							))}
						</div>
					</div>
				</div>

				{/* ── Table card ── */}
				<div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
					{/* Table toolbar */}
					<div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
						<Skel className="h-4 w-36" />
						<Skel className="h-8 w-20 rounded-md" />
					</div>
					{/* Column headers */}
					<div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-2.5 border-b border-border">
						{["w-20", "w-24", "w-14", "w-16", "w-14"].map((widthClass, i) => (
							<Skel key={i} className={`h-2.5 ${widthClass}`} />
						))}
					</div>{" "}
					{/* Rows */}
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-border last:border-0"
							style={{ opacity: 1 - i * 0.12 }}
						>
							<div className="flex flex-col gap-1.5">
								<Skel className="h-3 w-[70%]" />
								<Skel className="h-2 w-[50%]" />
							</div>
							<Skel className="h-3 w-[65%] self-center" />
							<Skel className="h-3 w-[80%] self-center" />
							<Skel className="h-5 w-14 rounded-full self-center" />
							<Skel className="size-6 rounded self-center" />
						</div>
					))}
				</div>

				{/* ── Dot loader ── */}
				<div className="flex items-center justify-center gap-2 py-1">
					<div className="size-1.5 rounded-full bg-primary animate-dot-1" />
					<div className="size-1.5 rounded-full bg-primary animate-dot-2" />
					<div className="size-1.5 rounded-full bg-primary animate-dot-3" />
					<span className="text-xs text-muted-foreground ml-1">Loading…</span>
				</div>
			</div>
		</>
	);
}

/* ════════════════════════════════════════════════════════════════════
   2. ROUTE ERROR COMPONENT
   Receives { error, reset } from TanStack Router.
   Renders inside the layout shell. Auto-classifies error type.
   ════════════════════════════════════════════════════════════════════ */
export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
	const router = useRouter();

	const msg = error?.message?.toLowerCase() ?? "";
	const is404 = msg.includes("not found");
	const isAuth = msg.includes("unauthorized") || msg.includes("403");
	const isNetwork = msg.includes("network") || msg.includes("fetch");

	type Variant = {
		Icon: typeof Compass;
		iconClass: string;
		wrapClass: string;
		accentClass: string;
		shake: boolean;
		title: string;
		desc: string;
	};

	const variant: Variant = is404
		? {
				Icon: Compass,
				iconClass: "text-warning-foreground",
				wrapClass: "bg-warning border-warning/40",
				accentClass: "bg-warning-foreground/50",
				shake: false,
				title: "Page not found",
				desc: "The page you're looking for doesn't exist or may have been moved.",
			}
		: isAuth
			? {
					Icon: ShieldAlert,
					iconClass: "text-[oklch(0.45_0.18_300)]",
					wrapClass: "bg-[oklch(0.96_0.02_300)] border-[oklch(0.88_0.06_300)]",
					accentClass: "bg-[oklch(0.45_0.18_300)]/50",
					shake: false,
					title: "Access denied",
					desc: "You don't have permission to view this section. Contact your administrator.",
				}
			: isNetwork
				? {
						Icon: WifiOff,
						iconClass: "text-muted-foreground",
						wrapClass: "bg-muted border-border",
						accentClass: "bg-muted-foreground/40",
						shake: true,
						title: "Connection problem",
						desc: "Unable to reach the server. Check your internet connection and try again.",
					}
				: {
						Icon: ServerCrash,
						iconClass: "text-destructive",
						wrapClass: "bg-danger border-danger/40",
						accentClass: "bg-destructive/60",
						shake: true,
						title: "Something went wrong",
						desc: "An unexpected error occurred while loading this page.",
					};

	const { Icon } = variant;

	return (
		<>
			<Keyframes />

			<div className="flex items-center justify-center  p-6 animate-in fade-in duration-300">
				<div
					className={`
            w-full max-w-md rounded-xl border border-border shadow-md overflow-hidden
            ${variant.wrapClass}
          `}
				>
					<div className="p-8">
						{/* Icon */}
						<div
							className={`
                size-13 rounded-xl flex items-center justify-center mb-5
                bg-background/60
                ${variant.shake ? "animate-err-shake" : ""}
              `}
						>
							<Icon size={24} className={variant.iconClass} strokeWidth={1.7} />
						</div>

						{/* Title */}
						<h2 className="font-display text-xl font-bold text-foreground tracking-tight mb-2">
							{variant.title}
						</h2>

						{/* Description */}
						<p className="text-sm text-muted-foreground leading-relaxed mb-5">
							{variant.desc}
						</p>

						{/* Error detail accordion */}
						{error?.message && !is404 && !isAuth && (
							<details className="mb-5 bg-background/70 border border-border rounded-md overflow-hidden">
								<summary className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none list-none">
									<AlertTriangle size={12} strokeWidth={2} />
									Error details
								</summary>
								<div className="px-3.5 py-3 border-t border-border font-mono text-xs text-destructive leading-relaxed break-all">
									{error.message}
								</div>
							</details>
						)}

						{/* Actions */}
						<div className="grid md:grid-cols-2 gap-2">
							{reset && (
								<button
									onClick={reset}
									type="button"
									className="
                    inline-flex justify-center items-center gap-1.5 text-sm font-medium
                    px-4 py-2 rounded-md border-[1.5px]
                    bg-primary text-primary-foreground border-primary
                    hover:brightness-90 hover:-translate-y-px
                    active:translate-y-0 transition-all duration-150 cursor-pointer
                  "
								>
									<RefreshCw size={14} strokeWidth={2} />
									Try again
								</button>
							)}
							<button
								onClick={() => router.history.back()}
								type="button"
								className="
                  inline-flex justify-center items-center gap-1.5 text-sm font-medium
                  px-4 py-2 rounded-md border-[1.5px]
                  bg-transparent text-muted-foreground border-border
                  hover:bg-muted hover:text-foreground hover:border-border/80
                  hover:-translate-y-px active:translate-y-0
                  transition-all duration-150 cursor-pointer
                "
							>
								<ArrowLeft size={14} strokeWidth={2} />
								Go back
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

/* ════════════════════════════════════════════════════════════════════
   3. GLOBAL PENDING COMPONENT
   Full-viewport branded loader. Shown before the layout shell mounts
   (used as defaultPendingComponent / pendingComponent in __root.tsx).
   ════════════════════════════════════════════════════════════════════ */
export function GlobalPendingComponent() {
	return (
		<>
			<Keyframes />

			{/*
        The sidebar background colour (#15201e) is the deep-teal dark
        used in the sidebar. It isn't a semantic token in the theme so
        we reference it via an arbitrary value.
      */}
			<div
				className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden"
				style={{
					background: `
            radial-gradient(ellipse 70% 50% at 15% 15%, oklch(0.40 0.08 170 / 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 70% at 88% 88%, oklch(0.12 0.03 170 / 0.80) 0%, transparent 50%),
            oklch(0.12 0.03 170)
          `,
				}}
			>
				{/* Grain overlay */}
				<div
					className="absolute inset-0 pointer-events-none opacity-50"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
					}}
				/>

				{/* Rotating geometry rings */}
				{(
					[
						{ size: 480, cls: "animate-geo-cw-80", opacity: "opacity-[0.08]" },
						{ size: 320, cls: "animate-geo-ccw", opacity: "opacity-[0.12]" },
						{ size: 190, cls: "animate-geo-cw-35", opacity: "opacity-[0.17]" },
					] as const
				).map((r, i) => (
					<div
						key={i}
						className={`absolute rounded-full border border-[oklch(0.70_0.12_80)] pointer-events-none ${r.cls} ${r.opacity}`}
						style={{ width: r.size, height: r.size }}
					/>
				))}

				{/* Stained-glass SVG lines */}
				<svg
					className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
					viewBox="0 0 800 800"
					preserveAspectRatio="xMidYMid slice"
					aria-hidden
				>
					<line
						x1="400"
						y1="0"
						x2="0"
						y2="800"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.8"
					/>
					<line
						x1="400"
						y1="0"
						x2="800"
						y2="800"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.8"
					/>
					<line
						x1="400"
						y1="0"
						x2="400"
						y2="800"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.8"
					/>
					<line
						x1="0"
						y1="400"
						x2="800"
						y2="400"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.6"
					/>
					<circle
						cx="400"
						cy="400"
						r="200"
						fill="none"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.5"
					/>
					<circle
						cx="400"
						cy="400"
						r="130"
						fill="none"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.4"
					/>
					<polygon
						points="400,240 556,480 244,480"
						fill="none"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.5"
					/>
					<polygon
						points="400,560 244,320 556,320"
						fill="none"
						stroke="oklch(0.70 0.12 80)"
						strokeWidth="0.5"
					/>
				</svg>

				{/* Logo + spinner */}
				<div className="relative z-10 flex flex-col items-center gap-0">
					<div className="relative size-20 mb-6">
						{/* Pulse glow */}
						<div
							className="absolute -inset-3 rounded-full animate-pulse-ring pointer-events-none"
							style={{
								background:
									"radial-gradient(circle, oklch(0.40 0.08 170 / 0.30) 0%, transparent 70%)",
							}}
						/>
						{/* Spinning arc SVG */}
						<svg
							className="absolute -inset-1.5 animate-spin-logo"
							width={92}
							height={92}
							viewBox="0 0 92 92"
							aria-hidden
						>
							<circle
								cx={46}
								cy={46}
								r={42}
								fill="none"
								stroke="oklch(0.70 0.12 80 / 0.18)"
								strokeWidth={2}
							/>
							<circle
								cx={46}
								cy={46}
								r={42}
								fill="none"
								stroke="oklch(0.70 0.12 80)"
								strokeWidth={2}
								strokeLinecap="round"
								strokeDasharray="60 200"
							/>
						</svg>
						{/* Logo disc */}
						<div
							className="absolute inset-0 rounded-full flex items-center justify-center animate-float"
							style={{
								background:
									"linear-gradient(140deg, oklch(0.40 0.08 170) 0%, oklch(0.25 0.06 170) 100%)",
								border: "1px solid oklch(0.70 0.12 80 / 0.30)",
								boxShadow: "0 4px 20px oklch(0.40 0.08 170 / 0.50)",
							}}
						>
							<Layers
								size={28}
								className="text-[oklch(0.78_0.10_170)]"
								strokeWidth={1.5}
							/>
						</div>
					</div>

					{/* Brand */}
					<p className="font-display text-2xl font-bold text-white tracking-widest animate-in fade-in duration-500">
						Ecclesia
					</p>
					<p className="text-[0.6rem] font-medium tracking-[0.18em] uppercase text-[oklch(0.78_0.10_170)/65] mt-1 mb-7 animate-in fade-in slide-in-from-bottom-1 duration-500 delay-100">
						Church Management
					</p>

					{/* Dot loader */}
					<div className="flex items-center gap-2">
						<div className="size-1.5 rounded-full bg-[oklch(0.70_0.12_80)] animate-dot-1" />
						<div className="size-1.5 rounded-full bg-[oklch(0.70_0.12_80)] animate-dot-2" />
						<div className="size-1.5 rounded-full bg-[oklch(0.70_0.12_80)] animate-dot-3" />
					</div>

					{/* Progress bar */}
					<div className="mt-5 w-40 h-0.5 rounded-full bg-[oklch(0.70_0.12_80)/15] overflow-hidden">
						<div
							className="h-full rounded-full animate-progress"
							style={{
								background:
									"linear-gradient(90deg, oklch(0.40 0.08 170), oklch(0.70 0.12 80))",
							}}
						/>
					</div>
				</div>
			</div>
		</>
	);
}

/* ════════════════════════════════════════════════════════════════════
   4. GLOBAL NOT FOUND
   Full-page 404. Shown outside the layout shell via notFoundComponent
   in createRootRoute(). Split layout: dark decorative left + content right.
   ════════════════════════════════════════════════════════════════════ */
export function GlobalNotFound() {
	const router = useRouter();

	const QUICK_LINKS = [
		{ label: "Finance", to: "/finance" },
		{ label: "Receipts", to: "/finance/receipts" },
		{ label: "Members", to: "/members" },
		{ label: "Requisitions", to: "/finance/requisitions" },
		{ label: "Reports", to: "/finance/reports" },
	];

	return (
		<>
			<Keyframes />

			<div className="flex min-h-screen overflow-hidden bg-background font-sans">
				{/* Sidebar accent strip */}
				<div
					className="w-1.5 shrink-0"
					style={{
						background:
							"linear-gradient(180deg, oklch(0.40 0.08 170) 0%, oklch(0.25 0.06 170) 50%, oklch(0.15 0.04 170) 100%)",
					}}
				/>

				{/* ── Left decorative panel ── */}
				<div
					className="hidden lg:flex w-90 shrink-0 relative overflow-hidden items-center justify-center"
					style={{ background: "oklch(0.12 0.03 170)" }}
				>
					{/* Radial blobs */}
					<div
						className="absolute inset-0 pointer-events-none"
						style={{
							background: `
                radial-gradient(ellipse 80% 60% at 30% 30%, oklch(0.40 0.08 170 / 0.40) 0%, transparent 60%),
                radial-gradient(ellipse 60% 80% at 80% 80%, oklch(0.12 0.03 170 / 0.70) 0%, transparent 50%)
              `,
						}}
					/>

					{/* Geo lines SVG */}
					<svg
						className="absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none"
						viewBox="0 0 360 800"
						preserveAspectRatio="xMidYMid slice"
						aria-hidden
					>
						<line
							x1="180"
							y1="0"
							x2="0"
							y2="800"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.7"
						/>
						<line
							x1="180"
							y1="0"
							x2="360"
							y2="800"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.7"
						/>
						<line
							x1="180"
							y1="0"
							x2="180"
							y2="800"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.7"
						/>
						<line
							x1="0"
							y1="400"
							x2="360"
							y2="400"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.5"
						/>
						<circle
							cx="180"
							cy="400"
							r="130"
							fill="none"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.5"
						/>
						<circle
							cx="180"
							cy="400"
							r="80"
							fill="none"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.4"
						/>
						<polygon
							points="180,280 280,460 80,460"
							fill="none"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.5"
						/>
						<polygon
							points="180,520 80,340 280,340"
							fill="none"
							stroke="oklch(0.70 0.12 80)"
							strokeWidth="0.5"
						/>
					</svg>

					{/* 404 + compass */}
					<div className="relative z-10 flex flex-col items-center select-none">
						<span
							className="font-display font-black leading-none tracking-tighter"
							style={{
								fontSize: "9rem",
								color: "transparent",
								WebkitTextStroke: "1px oklch(0.70 0.12 80 / 0.35)",
							}}
						>
							404
						</span>
						<div
							className="mt-4 size-14 rounded-full flex items-center justify-center animate-float"
							style={{
								border: "1px solid oklch(0.70 0.12 80 / 0.30)",
								background: "oklch(0.40 0.08 170 / 0.20)",
							}}
						>
							<Compass
								size={26}
								className="text-[oklch(0.78_0.10_170)/80]"
								strokeWidth={1.4}
							/>
						</div>
					</div>
				</div>

				{/* ── Right content panel ── */}
				<div className="flex-1 flex flex-col items-start justify-center px-10 md:px-16 py-12 relative">
					{/* Top-right logo */}
					<div className="absolute top-6 right-8 flex items-center gap-2.5">
						<div className="size-8 rounded-lg bg-primary flex items-center justify-center">
							<Layers
								size={15}
								className="text-primary-foreground"
								strokeWidth={1.8}
							/>
						</div>
						<span className="font-display text-base font-bold text-foreground tracking-wide">
							Ecclesia
						</span>
					</div>

					{/* Eyebrow badge */}
					<div
						className="
            inline-flex items-center gap-1.5 mb-5
            bg-primary/10 text-primary
            text-[0.68rem] font-semibold uppercase tracking-widest
            px-3 py-1 rounded-full
            animate-in fade-in slide-in-from-bottom-2 duration-400
          "
					>
						<Compass size={12} strokeWidth={2.2} />
						Page not found
					</div>

					{/* Heading */}
					<h1
						className="
            font-display font-extrabold text-foreground
            text-4xl md:text-5xl leading-[1.08] tracking-tight
            max-w-lg mb-4
            animate-in fade-in slide-in-from-bottom-2 duration-400 delay-75
          "
					>
						You've wandered off
						<br />
						<span className="text-primary">the map.</span>
					</h1>

					{/* Body copy */}
					<p
						className="
            text-sm text-muted-foreground leading-relaxed max-w-sm mb-8
            animate-in fade-in slide-in-from-bottom-2 duration-400 delay-150
          "
					>
						The page you're looking for doesn't exist, was moved, or you may not
						have permission to view it. Let's get you back on track.
					</p>

					{/* Primary actions */}
					<div
						className="
            flex flex-wrap gap-2.5 mb-10
            animate-in fade-in slide-in-from-bottom-2 duration-400 delay-200
          "
					>
						<button
							onClick={() => router.navigate({ to: "/" })}
							className="
                inline-flex items-center gap-1.5 text-sm font-medium
                px-4 py-2.5 rounded-md border-[1.5px]
                bg-primary text-primary-foreground border-primary
                hover:brightness-90 hover:-translate-y-px
                active:translate-y-0 transition-all duration-150 cursor-pointer
              "
							type="button"
						>
							<Home size={14} strokeWidth={2} />
							Back to Dashboard
						</button>
						<button
							onClick={() => router.history.back()}
							type="button"
							className="
                inline-flex items-center gap-1.5 text-sm font-medium
                px-4 py-2.5 rounded-md border-[1.5px]
                bg-transparent text-muted-foreground border-border
                hover:bg-muted hover:text-foreground
                hover:-translate-y-px active:translate-y-0
                transition-all duration-150 cursor-pointer
              "
						>
							<ArrowLeft size={14} strokeWidth={2} />
							Go back
						</button>
					</div>

					{/* Quick links */}
					<div className="animate-in fade-in slide-in-from-bottom-2 duration-400 delay-300">
						<p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
							Quick links
						</p>
						<div className="flex flex-wrap gap-2">
							{QUICK_LINKS.map((link) => (
								<button
									type="button"
									key={link.to}
									onClick={() => router.navigate({ to: link.to })}
									className="
                    text-[0.76rem] font-medium
                    px-3 py-1.5 rounded-md
                    bg-card text-muted-foreground border border-border
                    hover:border-primary hover:text-primary
                    transition-all duration-150 cursor-pointer
                  "
								>
									{link.label}
								</button>
							))}
						</div>
					</div>

					{/* Bottom ornament */}
					<div className="absolute bottom-6 left-10 md:left-16 flex items-center gap-2">
						<div className="w-8 h-px bg-border" />
						<span className="text-[0.6rem] text-muted-foreground tracking-wide">
							© 2025 Ecclesia CMS
						</span>
					</div>
				</div>
			</div>
		</>
	);
}
