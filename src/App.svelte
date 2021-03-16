<script>
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

<MaterialApp>
	<AppBar>
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
		<TextField dense rounded outlined nolabel label="Search">
			Search
			<div slot="append">
				<Icon path={mdiMagnify} />
			</div></TextField
		>
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
		<Row>
			<!-- Row is a wrapper component for Col -->
			<Col class="align-self-end">
				<div class="float-right">
					<Button fab class="green white-text">
						<Icon path={mdiLayersTripleOutline} />
					</Button>
				</div>
			</Col>
		</Row>
	</div>

	<Footer
		noGutters
		absolute
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
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
