import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LogOutIcon, UserKeyIcon } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { MENU_ITEMS } from "#/lib/constants";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Command } from "@/components/ui/command";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/(authed)")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b border-b-border">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1 inline-flex md:hidden" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="/">
										Build Your Application
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage>Data Fetching</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="py-6 ml-auto">
								<Avatar>
									<AvatarImage src="https://github.com/shadcn.png" />
									<AvatarFallback>CN</AvatarFallback>
								</Avatar>
								<span className="hidden md:block">Nick Mackenzie</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
							align="end"
							sideOffset={4}
						>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage
											src="https://github.com/shadcn.png"
											alt="Nick Mackenzie"
										/>
										<AvatarFallback className="rounded-lg">CN</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">Nick Mackenzie</span>
										<span className="truncate text-xs text-muted-foreground">
											Administrator
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem>
									<UserKeyIcon />
									Change Password
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<LogOutIcon />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

function AppSidebar() {
	return (
		<Sidebar variant="sidebar" className="border-r border-r-border">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<a href="/">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									<Command className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">Acme Inc</span>
									<span className="truncate text-xs">Enterprise</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="bg-sidebar-accent">
				<NavItems />
			</SidebarContent>
			<SidebarFooter className="flex-row justify-center bg-sidebar-accent border-t border-t-border">
				<ThemeToggle />
			</SidebarFooter>
		</Sidebar>
	);
}

function NavItems() {
	const [search, setSearch] = useState<string>("");

	const filteredMenuItems = MENU_ITEMS.map((group) => {
		const searchQuery = search.toLowerCase().trim();
		// If the user searches for the group label (e.g., "Admin"), show the whole group.
		const groupMatches = group.label.toLowerCase().includes(searchQuery);

		const filteredChildren = groupMatches
			? group.children
			: group.children.filter((item) =>
					item.label.toLowerCase().includes(searchQuery),
				);

		return { ...group, children: filteredChildren };
	}).filter((group) => group.children.length > 0);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	};

	return (
		<div>
			<div className="px-4 pt-2">
				<Input
					value={search}
					onChange={handleInputChange}
					placeholder="Search menu"
					className="w-full bg-input"
				/>
			</div>
			{filteredMenuItems.map((m) => (
				<SidebarGroup
					key={m.label}
					className="group-data-[collapsible=icon]:hidden"
				>
					<SidebarGroupLabel>{m.label}</SidebarGroupLabel>
					<SidebarMenu>
						{m.children.map((item) => (
							<SidebarMenuItem key={item.label}>
								<SidebarMenuButton asChild>
									<Link
										to={item.href}
										activeOptions={item.activeOptions}
										activeProps={{
											className: `font-bold text-sidebar-primary`,
										}}
									>
										<item.icon />
										<span>{item.label}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			))}
		</div>
	);
}
