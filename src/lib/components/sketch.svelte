<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, addDoc, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firestore';

	const sketchCollection = collection(db, 'sketches');

	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let drawing = false;
	type DrawingAction = {
		type: 'moveTo' | 'lineTo';
		x: number;
		y: number;
	};

	const drawingActions: DrawingAction[] = [];
	let sketches: DrawingAction[][] = [];

	const fetchSketches = async () => {
		const snapshot = await getDocs(sketchCollection);
		sketches = snapshot.docs.map((doc) => doc.data().drawingActions);
	};

	onMount(() => {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Fetch sketches on mount
		fetchSketches();

		// Register event listeners for drawing actions
		canvas.addEventListener('mousedown', startDrawing);
		canvas.addEventListener('mousemove', draw);
		canvas.addEventListener('mouseup', endDrawing);
		canvas.addEventListener('mouseout', endDrawing);

		canvas.addEventListener('touchstart', startDrawing);
		canvas.addEventListener('touchmove', draw);
		canvas.addEventListener('touchend', endDrawing);
		canvas.addEventListener('touchcancel', endDrawing);
	});

	const startDrawing = (event: MouseEvent | TouchEvent) => {
		event.preventDefault();
		if (canvas === null || ctx === null) return;
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
		ctx.beginPath();
		ctx.moveTo(x, y);
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

	const saveSketch = async () => {
		if (canvas === null || ctx === null) return;
		await addDoc(sketchCollection, { drawingActions });
		await fetchSketches();
		resetCanvas();
	};

	const resetCanvas = () => {
		if (canvas === null || ctx === null) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawingActions.length = 0;
	};

	const redrawCanvases = () => {
		sketches.forEach((sketch, i) => {
			const canvas = document.getElementById(`canvas-${i}`) as HTMLCanvasElement | null;
			const ctx = canvas?.getContext('2d');
			if (canvas === null || ctx === null) return;

			sketch.forEach((action) => {
				if (ctx === null) return; // Check if ctx is null
				if (typeof ctx === 'undefined') return;
				if (action.type === 'moveTo') {
					ctx.moveTo(action.x, action.y);
				} else if (action.type === 'lineTo') {
					ctx.lineTo(action.x, action.y);
					ctx.stroke();
				}
			});
		});
	};
</script>

<main>
	<div class="content">
		<h1>Sketch Pad</h1>
		<canvas bind:this={canvas} width="400" height="400" />
		<button on:click={saveSketch}>Save Sketch</button>
	</div>

	<div class="gallery">
		{#each sketches as sketch, i}
			<div class="sketch">
				<canvas id={`canvas-${i}`} width="400" height="400" style="border: 1px solid black" />
				<button on:click={redrawCanvases}>Redraw</button>
				<!-- Remove the argument -->
			</div>
		{/each}
	</div>
</main>

<style>
	.content {
		position: relative;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		font-family: Arial, Helvetica, sans-serif;
		background-color: blueviolet;
	}

	canvas {
		background-color: white;
	}

	.gallery {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.sketch {
		margin: 1rem;
	}
</style>
