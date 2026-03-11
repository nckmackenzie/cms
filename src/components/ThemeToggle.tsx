import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";

type ThemeMode = "light" | "dark" | "auto";

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") {
		return "auto";
	}

	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "auto") {
		return stored;
	}

	return "auto";
}

function applyThemeMode(mode: ThemeMode) {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(resolved);

	if (mode === "auto") {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.setAttribute("data-theme", mode);
	}

	document.documentElement.style.colorScheme = resolved;
}

const BUTTONS = [
	{
		mode: "light" as ThemeMode,
		icon: <SunIcon />,
		label: "Light",
		ariaLabel: "Light mode",
	},
	{
		mode: "dark" as ThemeMode,
		icon: <MoonIcon />,
		label: "Dark",
		ariaLabel: "Dark mode",
	},
	{
		mode: "auto" as ThemeMode,
		icon: <MonitorIcon />,
		label: "Auto",
		ariaLabel: "Auto(System) mode",
	},
];

export function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>("auto");

	useEffect(() => {
		const initialMode = getInitialMode();
		setMode(initialMode);
		applyThemeMode(initialMode);
	}, []);

	useEffect(() => {
		if (mode !== "auto") {
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyThemeMode("auto");

		media.addEventListener("change", onChange);
		return () => {
			media.removeEventListener("change", onChange);
		};
	}, [mode]);

	function toggleMode(mode: ThemeMode) {
		setMode(mode);
		applyThemeMode(mode);
		window.localStorage.setItem("theme", mode);
	}

	return (
		<ButtonGroup>
			{BUTTONS.map((button) => (
				<Button
					key={button.mode}
					size="sm"
					variant={mode === button.mode ? "secondary" : "outline"}
					onClick={() => {
						toggleMode(button.mode);
					}}
					aria-label={button.ariaLabel}
					title={button.ariaLabel}
				>
					{button.icon}
					<span>{button.label}</span>
				</Button>
			))}
		</ButtonGroup>
	);
}
