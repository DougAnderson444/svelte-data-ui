<script>
	import Vertical from "./Vertical.svelte";
	import {
		AppBar,
		Menu,
		Container,
		Row,
		Col,
		MaterialApp,
		Button,
		Icon,
		Footer,
		List,
		ListItem,
		TextField,
		NavigationDrawer,
		Overlay,
		Window,
		WindowItem,
	} from "svelte-materialify";
	import {
		mdiHome,
		mdiPlusThick,
		mdiCardAccountDetailsOutline,
		mdiCloud,
		mdiLayersTripleOutline,
		mdiMenu,
		mdiDotsVertical,
		mdiMagnify,
		mdiAccount,
	} from "@mdi/js";
</script>

<svelte:head>
	<title>Material UI App</title>
</svelte:head>

<MaterialApp>
	<AppBar
		fixed
		style="margin-right:0px; width: 100%; width: -webkit-fill-available;width: -webkit-fill-available; width: fill-available;"
	>
		<Menu>
			<div slot="activator">
				<Button depressed>
					<Icon path={mdiMenu} />
				</Button>
			</div>
			<List>
				<ListItem>
					Home
					<span slot="prepend">
						<Icon path={mdiHome} />
					</span>
				</ListItem>
			</List>
		</Menu>
		<div style="flex-grow:1">
			<TextField dense rounded outlined>
				Search
				<div slot="append">
					<Icon path={mdiMagnify} />
				</div></TextField
			>
		</div>
		<div style="flex-grow:0" />
		<Menu>
			<div slot="activator">
				<Button depressed>
					<Icon path={mdiCardAccountDetailsOutline} />
				</Button>
			</div>
			<ListItem>Profile</ListItem>
			<ListItem>Keys</ListItem>
			<ListItem>Logout</ListItem>
		</Menu>
		<Menu right>
			<div slot="activator">
				<Button depressed>
					<Icon path={mdiDotsVertical} />
				</Button>
			</div>
			<ListItem>Item 1</ListItem>
			<ListItem>Item 2</ListItem>
			<ListItem>Item 3</ListItem>
		</Menu>
	</AppBar>
	<div class="container">
		<p>1. Content goes here</p>
		<p>Content goes here</p>
		<p>Content goes here</p>
		<p>Content goes here</p>
		<p>Content goes here</p>
		<p>Content goes here</p>
		<p>Content goes here</p>
	</div>
	<Button
		fab
		class="green white-text"
		style="position: fixed; top: 70px; right: 16px;"
	>
		<Icon path={mdiLayersTripleOutline} />
	</Button>
	<Footer
		noGutters
		fixed
		class="justify-space-between float-right"
		style="background-color: #0000"
	>
		<Button fab class="blue white-text">
			<Icon path={mdiHome} />
		</Button>

		<Button fab class="green white-text">
			<Icon path={mdiPlusThick} />
		</Button>
	</Footer>
</MaterialApp>

<style>
	.container {
		padding: 80px 8px 8px 8px;
		color: darkgreen;
		background-color: #c8e6c959;
		overflow-y: hidden;
		height: 100vh;
	}
</style>
