<script>
	import {
		Container,
		Row,
		Col,
		TextField,
		Select,
		List,
		ListItem,
		Button,
	} from "svelte-materialify/src";

	const keys = [
		{ name: "Phone", value: "Phone" },
		{ name: "Address", value: "Address" },
		{ name: "email", value: "email" },
	];

	let entries = [
		{ key: "Phone", value: "555-123-4567" },
		{ key: "email", value: "email@email.com" },
	];

	let prefix = "";
	let key = "";
	let value = "";
	let selected = "";
	$: filteredPeople = prefix
		? entries.filter((entry) => {
				const name = `${entry.key}: ${entry.value}`;
				return name.toLowerCase().startsWith(prefix.toLowerCase());
		  })
		: entries;

	function getValue(key) {
		selected = entries.find((entry) => entry.key === key);
		return selected;
	}

	$: value = key && getValue(key) ? getValue(key).value : "";

	$: reset_inputs(selected);

	function create() {
		entries = entries.concat({ key, value });
		key = value = "";
	}

	function update() {
		selected.key = key;
		selected.value = value;
		entries = entries;
	}

	function remove() {
		// Remove selected entry from the source array (entries), not the filtered array
		const index = entries.indexOf(selected);
		entries = [...entries.slice(0, index), ...entries.slice(index + 1)];

		key = value = "";
	}

	function reset_inputs(entry) {
		key = entry ? entry.key : "";
		value = entry ? entry.value : "";
		console.log("setting value to ", value);
	}
</script>

<Container>
	<Row>
		<Col>
			<Select
				bind:value={key}
				outlined
				items={keys}
				on:change={() => {
					console.log({ key });
					key = key;
				}}>Select...</Select
			>
			<TextField bind:value placeholder="Value" outlined>Value</TextField>
		</Col>
		<Col class="flex-sm-column">
			<Button on:click={create} disabled={!key || !value}>create</Button>
			<Button on:click={update} disabled={!key || !value || !selected}
				>update</Button
			>
			<Button on:click={remove} disabled={!selected}>delete</Button>
		</Col>
	</Row>
</Container>
<TextField placeholder="Starts with" outlined bind:value={prefix}
	>Search</TextField
>

<!-- <div class="elevation-2" style="width:300px; height: 200px;"> -->
<List>
	{#each filteredPeople as entry, i}
		<ListItem
			>{entry.key}<span slot="subtitle">{entry.value}</span></ListItem
		>
	{/each}
</List>

<!-- class="d-flex justify-space-around" -->
<style>
</style>
