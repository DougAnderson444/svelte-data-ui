<script>
	import Engine from "peerpiper-engine";
	import UI from "svelte-data-ui";

	// Assuming "?post=1234&action=edit"

	var urlParams = new URLSearchParams(window.location.search);
	console.log(window.location);
	console.log(window.URL);
	console.log(window.location.href);
	console.log(window.location.pathname);
	console.log({ urlParams });
	console.log(urlParams.has("post")); // true
	console.log(urlParams.get("action")); // "edit"
	console.log(urlParams.getAll("action")); // ["edit"]
	console.log(urlParams.toString()); // "?post=1234&action=edit"
	urlParams.append("active", 1); // "?post=1234&action=edit&active=1"

	window.location.hash = "aHash";
</script>

<main>
	<UI><Engine /></UI>
</main>
