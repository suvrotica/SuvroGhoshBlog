<script lang="ts">
	import Sketch from '$lib/components/sketch.svelte';
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { ref, push, remove, update, onValue } from 'firebase/database';

	async function deletePost(key: string) {
		const postRef = ref(db, 'posts/' + key);
		await remove(postRef);
	}

	interface Post {
		title: string;
		content: string;
	}

	export let data: Record<string, Post> = {};
	let loading = true;
	let title = '';
	let content = '';

	onMount(async () => {
		const postsRef = ref(db, 'posts');
		onValue(postsRef, (snapshot) => {
			data = snapshot.val();
			loading = false;
		});
	});

	async function updatePost(key: string, updatedPost: Post) {
		const postRef = ref(db, 'posts/' + key);
		await update(postRef, updatedPost);
	}

	async function createPost() {
		const postsRef = ref(db, 'posts');
		await push(postsRef, { title, content });
	}
</script>

<Sketch />
<form on:submit|preventDefault={createPost}>
	<input bind:value={title} placeholder="Title" required />
	<textarea bind:value={content} placeholder="Content" required />
	<button type="submit">Create Post</button>
</form>

<h1>Data from Firebase</h1>
<pre>{JSON.stringify(data, null, 2)}</pre>
{#if loading}
	<p>Loading...</p>
{:else}
	{#each Object.entries(data) as [key, post] (key)}
		<article>
			<h2>{post.title}</h2>
			<p>{post.content}</p>
		</article>
	{/each}
{/if}
