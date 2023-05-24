<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { collection, addDoc, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firestore';

	let sketches: DrawingAction[][] = [];
	const sketchCollection = collection(db, 'sketches');

	type DrawingAction = {
		type: 'moveTo' | 'lineTo';
		x: number;
		y: number;
	};

	const drawingActions: DrawingAction[] = [];

	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let drawing = false;
	let mounted = false;

	const startDrawing = (event: MouseEvent | TouchEvent) => {
		event.preventDefault();
		if (canvas === null) {
			return;
		}
		const rect = canvas.getBoundingClientRect();
		let clientX: number, clientY: number;
		if ('touches' in event) {
			// The event is a TouchEvent
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			// The event is a MouseEvent
			clientX = event.clientX;
			clientY = event.clientY;
		}
		const x = clientX - rect.left;
		const y = clientY - rect.top;
		drawing = true;
		drawingActions.push({ type: 'moveTo', x, y });
		if (ctx !== null) {
			ctx.moveTo(x, y);
		}
	};

	const draw = (event: MouseEvent | TouchEvent) => {
		event.preventDefault();
		if (!drawing || canvas === null || ctx === null) return;
		const rect = canvas.getBoundingClientRect();
		let clientX: number, clientY: number;
		if ('touches' in event) {
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			clientX = event.clientX;
			clientY = event.clientY;
		}
		const x = clientX - rect.left;
		const y = clientY - rect.top;
		drawingActions.push({ type: 'lineTo', x, y });
		ctx.lineTo(x, y);
		ctx.stroke();
	};

	const endDrawing = (event: MouseEvent | TouchEvent) => {
		event.preventDefault();
		if (!drawing) return;
		drawing = false;
	};
	let showNotification = false;
	const saveSketch = async () => {
		if (canvas === null || ctx === null) return;

		await addDoc(sketchCollection, { drawingActions });

		// Add the new sketch to the gallery
		sketches = [...sketches, [...drawingActions]]; // Create a copy of drawingActions

		// Clear the canvas and the drawing actions
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.beginPath(); // Reset the drawing path
		drawingActions.length = 0;
		// Show notification
		showNotification = true;
		setTimeout(() => {
			showNotification = false;
		}, 2000); // Hide notification after 2 seconds
	};

	onMount(() => {
		const fetchSketches = async () => {
			const sketchDocs = await getDocs(sketchCollection);
			sketches = sketchDocs.docs.map((doc) => doc.data().drawingActions);
		};
		fetchSketches();
		mounted = true;
	});

	afterUpdate(() => {
		if (mounted && canvas) {
			ctx = canvas.getContext('2d');
			if (!ctx) return;
			canvas.addEventListener('mousedown', startDrawing);
			canvas.addEventListener('mousemove', draw);
			canvas.addEventListener('mouseup', endDrawing);
			canvas.addEventListener('mouseout', endDrawing);
			canvas.addEventListener('touchstart', startDrawing);
			canvas.addEventListener('touchmove', draw);
			canvas.addEventListener('touchend', endDrawing);
		}
	});

	onDestroy(() => {
		if (canvas) {
			canvas.removeEventListener('mousedown', startDrawing);
			canvas.removeEventListener('mousemove', draw);
			canvas.removeEventListener('mouseup', endDrawing);
			canvas.removeEventListener('mouseout', endDrawing);
			canvas.removeEventListener('touchstart', startDrawing);
			canvas.removeEventListener('touchmove', draw);
			canvas.removeEventListener('touchend', endDrawing);
		}
	});

	function renderSketch(node: HTMLCanvasElement, [drawingActions]: [DrawingAction[]]) {
		const context = node.getContext('2d');

		if (!context) {
			return;
		}

		context.clearRect(0, 0, node.width, node.height);
		context.beginPath();
		context.strokeStyle = 'black';
		context.lineWidth = 2;

		for (const action of drawingActions) {
			if (action.type === 'moveTo') {
				context.moveTo(action.x, action.y);
			} else if (action.type === 'lineTo') {
				context.lineTo(action.x, action.y);
				context.stroke();
			}
		}
		context.closePath(); // Close the path after drawing
	}
</script>

<main>
	<div class="container">
		<h1>Sketch Pad</h1>
		<div class="sketchpad">
			<canvas bind:this={canvas} style="height: 80%;" />
			<button class="button" on:click={saveSketch}>Save Sketch</button>
		</div>
	</div>

	<div class="gallery">
		{#each sketches as sketch (sketch)}
			<canvas class="gallery-item" use:renderSketch={[sketch]} width="400" height="400" />
		{/each}
	</div>

	<div class="notification" class:active={showNotification}>Sketch saved!</div>
</main>

<style>
	:global(body) {
		margin: 0;
		background-color: blueviolet;
		font-family: Arial, Helvetica, sans-serif;
		overflow: hidden;
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 50vh;
		overflow: auto;
	}

	.sketchpad {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	h1 {
		margin-bottom: 20px;
	}

	canvas {
		background-color: white;
		border: 1px solid black;
	}

	.button {
		margin-top: 20px;
		padding: 10px 20px;
		border: none;
		background-color: white;
		cursor: pointer;
		height: 10%;
	}

	.button:active {
		background-color: #ddd;
	}

	.gallery {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		height: 50vh;
		overflow: auto;
		padding: 10px;
	}

	.gallery-item {
		width: 100px;
		height: 100px;
		margin: 5px;
		border: 1px solid black;
	}

	.notification {
		position: fixed;
		top: 20px;
		right: 20px;
		padding: 10px;
		background-color: rgb(176, 209, 113);
		color: rgb(0, 0, 0);
		border-radius: 5px;
		opacity: 0;
		transition: opacity 0.5s;
		pointer-events: none;
	}

	.notification.active {
		opacity: 1;
	}
</style>
