<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;

	const size = 400;

	onMount(() => {
		// Ensure that the canvas element has been created in the DOM
		if (canvas) {
			canvas.width = size;
			canvas.height = size;
			ctx = canvas.getContext('2d');

			if (!ctx) {
				throw new Error('Failed to get 2D rendering context');
			}

			// Handle mousedown events
			canvas.onmousedown = (evt) => {
				const rect = canvas.getBoundingClientRect();
				const mouse = {
					x: evt.clientX - rect.left,
					y: evt.clientY - rect.top
				};
				// Start drawing here
				if (ctx) {
					ctx.beginPath();
					ctx.moveTo(mouse.x, mouse.y);
				}
			};

			// Handle mousemove events for drawing
			canvas.onmousemove = (evt) => {
				if (evt.buttons === 1) {
					// Check if left button is pressed
					const rect = canvas.getBoundingClientRect();
					const mouse = {
						x: evt.clientX - rect.left,
						y: evt.clientY - rect.top
					};

					// Draw here
					if (ctx) {
						ctx.lineTo(mouse.x, mouse.y);
						ctx.stroke();
					}
				}
			};
		}
	});
</script>

<main>
	<div class="content">
		<h1>Sketch Pad</h1>
		<div class="sketch">
			<canvas bind:this={canvas} />
		</div>
	</div>
</main>

<style>
	/* your styles here */
</style>
