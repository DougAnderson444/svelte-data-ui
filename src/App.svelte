<script>
	import Dialog from "./Dialog.svelte";
	import {
		AppBar,
		Menu,
		MaterialApp,
		Button,
		Icon,
		Footer,
		List,
		ListItem,
		TextField,
		Subheader,
		ListItemGroup,
		Checkbox,
		Divider,
	} from "svelte-materialify";
	import {
		mdiHome,
		mdiPlusThick,
		mdiCardAccountDetailsOutline,
		mdiLayersTripleOutline,
		mdiMenu,
		mdiDotsVertical,
		mdiMagnify,
	} from "@mdi/js";
	let createActive;
	let filters = [];
	$: if (filters) console.log({ filters });
</script>

<svelte:head>
	<title>Material UI App</title>
</svelte:head>

<MaterialApp>
	<AppBar
		fixed
		style="margin-right:0px; width: 100%; width: -webkit-fill-available;width: -webkit-fill-available; width: fill-available;"
	>
		<Menu hover>
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
		<Menu hover>
			<div slot="activator">
				<Button depressed>
					<Icon path={mdiCardAccountDetailsOutline} />
				</Button>
			</div>
			<ListItem>Profile</ListItem>
			<ListItem>Keys</ListItem>
			<ListItem>Logout</ListItem>
		</Menu>
		<Menu right hover>
			<div slot="activator">
				<Button depressed>
					<Icon path={mdiDotsVertical} />
				</Button>
			</div>
			<List>
				<ListItem>Settings</ListItem>
				<ListItem>Privacy</ListItem>
			</List>
		</Menu>
	</AppBar>
	<div class="container">
		<slot>
			<p>Content goes here</p>
			<p>Content goes here</p>
			<p>Content goes here</p>
			<p>Content goes here</p>
			<p>Content goes here</p>
			<p>Content goes here</p>
			<p>Content goes here</p>
		</slot>
	</div>
	<div style="position: fixed; top: 70px; right: 16px;">
		<Menu right closeOnClick={false} hover>
			<div slot="activator">
				<Button fab class="green white-text">
					<Icon path={mdiLayersTripleOutline} />
				</Button>
			</div>
			<List class="elevation-2" style="width:300px;">
				<Subheader>Alerts</Subheader>
				<ListItem selectable>Notifications</ListItem>
				<Divider />
				<Subheader>Filters</Subheader>
				<ListItemGroup multiple bind:value={filters}>
					<ListItem value="Notifications">
						<span slot="prepend">
							<Checkbox
								group={filters}
								checked={filters.includes("Notifications")}
							/>
						</span>
						Notifications
						<span slot="subtitle"> Allow Notifications </span>
					</ListItem>
					<ListItem value="Sound">
						<span slot="prepend">
							<Checkbox
								group={filters}
								checked={filters.includes("Sound")}
							/>
						</span>
						Sound
						<span slot="subtitle"> Hangouts sound. </span>
					</ListItem>
					<ListItem value="Invites">
						<span slot="prepend">
							<Checkbox
								group={filters}
								checked={filters.includes("Invites")}
							/>
						</span>
						Invites
						<span slot="subtitle"> Notify when invited. </span>
					</ListItem>
				</ListItemGroup>
			</List>
		</Menu>
	</div>
	<Footer
		fixed
		class="justify-space-between float-right"
		style="background-color: #0000"
	>
		<Button fab class="blue white-text">
			<Icon path={mdiHome} />
		</Button>

		<Button
			fab
			class="green white-text"
			on:click={() => (createActive = true)}
		>
			<Icon path={mdiPlusThick} />
		</Button>
		<Dialog bind:active={createActive}
			>Add something to your profile!</Dialog
		>
	</Footer>
</MaterialApp>

<style>
	.container {
		padding: 80px 16px 12px 16px;
		color: darkgreen;
		background-color: #c8e6c959;
		overflow-y: hidden;
		height: 100vh;
	}
</style>
