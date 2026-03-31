<script lang="ts">
	import '../app.css';
	import Header from '../components/layout/Header.svelte';
	import Footer from '../components/layout/Footer.svelte';

	let { children, data } = $props();
</script>

<div class="min-h-screen flex flex-col bg-sp-light-gray font-sans text-sp-dark-text">
	<Header user={data.user} />

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
