<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { collection, addDoc } from 'firebase/firestore';
	import { db } from '$lib/firestore';

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

	const saveSketch = async () => {
		if (canvas === null || ctx === null) return;
		await addDoc(sketchCollection, { drawingActions });
	};

	onMount(() => {
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
</script>

<main>
	<div class="content">
		<h1>Sketch Pad</h1>
		<canvas bind:this={canvas} width="400" height="400" />
		<button on:click={saveSketch}>Save Sketch</button>
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
		border: 1px solid black;
	}
</style>
