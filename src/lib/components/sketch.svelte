<script lang="ts">
	// Importing necessary modules from Svelte and Firebase
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { collection, addDoc, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firestore'; // Firebase database connection

	// Declaring the type for DrawingAction
	type DrawingAction = {
		type: 'moveTo' | 'lineTo'; // Action type: move to a position or draw a line to a position
		x: number; // X coordinate of the action
		y: number; // Y coordinate of the action
	};

	// Array to store all the drawing actions for the current sketch
	const drawingActions: DrawingAction[] = [];

	// Variables to store the canvas and its 2D rendering context
	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;

	// Variable to check if the user is currently drawing, initialized as false
	let drawing = false;

	// Variable to check if the component is first mounted, initialized as false
	let mounted = false;

	// Variable to control the visibility of the "Sketch saved" notification, initialized as false
	let showNotification = false;

	// Array to store all the sketches fetched from Firestore
	let sketches: DrawingAction[][] = [];

	// Firestore collection where the sketches are stored
	const sketchCollection = collection(db, 'sketches');

	// Function called when the user starts to draw
	// The startDrawing function is an event handler that is called when a user starts drawing on the canvas.
	const startDrawing = (event: MouseEvent | TouchEvent) => {
		// Prevent the browser's default behavior for this event.
		// This could be useful to stop any unwanted side effects or behaviors.
		event.preventDefault();

		// If the canvas is null, the function will return immediately.
		// This ensures that we have a valid canvas to work with before proceeding.
		if (canvas === null) {
			return;
		}

		// Get the bounding rectangle of the canvas.
		// This gives us the position of the canvas within the viewport, as well as its size.
		const rect = canvas.getBoundingClientRect();

		// Initialize variables to store the x and y coordinates of the event (mouse click or touch).
		let clientX: number, clientY: number;

		// Check if the event is a TouchEvent
		if ('touches' in event) {
			// If it is, then we use the first touch point as our drawing start point.
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			// If it isn't a TouchEvent, it must be a MouseEvent,
			// so we use the mouse position as our drawing start point.
			clientX = event.clientX;
			clientY = event.clientY;
		}

		// Calculate the actual x and y coordinates on the canvas for drawing.
		// This is done by subtracting the canvas's position from the event's position.
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		// Set the drawing state to true as we're starting to draw now.
		drawing = true;

		// Add a 'moveTo' action with the calculated x and y coordinates to the drawingActions array.
		// This array likely holds the sequence of actions that constitute a drawing.
		drawingActions.push({ type: 'moveTo', x, y });

		// If the 2D rendering context of the canvas isn't null,
		// set the starting point for the new path as the calculated x and y coordinates.
		if (ctx !== null) {
			ctx.moveTo(x, y);
		}
	};

	// Function called when the user is drawing, used to draw lines on the canvas when the user moves their mouse (or their finger on a touchscreen) while pressing the mouse button (or their finger on the screen). The lines are drawn from the previous position to the new position of the mouse/finger.
	const draw = (event: MouseEvent | TouchEvent) => {
		// Call preventDefault to stop any default behavior from the browser.
		// This might include things like scrolling the page when you're trying to draw.
		event.preventDefault();

		// If the user isn't currently drawing, or the canvas or its context hasn't been set, exit the function.
		if (!drawing || canvas === null || ctx === null) return;

		// Get the position and size of the canvas. This returns a DOMRect object, which includes
		// details about the position of the element in relation to the viewport (screen).
		const rect = canvas.getBoundingClientRect();

		// Declare variables for the X and Y coordinates of the event.
		let clientX: number, clientY: number;

		// If the event is a TouchEvent (meaning the user is on a touchscreen device),
		// get the X and Y coordinates of the touch event.
		// Else, it's a MouseEvent and we get the X and Y coordinates of the mouse event.
		if ('touches' in event) {
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			clientX = event.clientX;
			clientY = event.clientY;
		}

		// Adjust the X and Y coordinates to account for the position of the canvas on the page.
		// This is necessary because event.clientX and event.clientY are relative to the viewport,
		// but we need coordinates relative to the canvas.
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		// Push the new lineTo action to the drawingActions array. The lineTo action signifies
		// that a line is drawn from the previous coordinates to the new x, y coordinates.
		drawingActions.push({ type: 'lineTo', x, y });

		// Draw a line from the current position of the path (which was the last position we drew at or moved to)
		// to the new x, y coordinates.
		ctx.lineTo(x, y);

		// Actually render the line on the canvas. Until this method is called, the line isn't visible.
		ctx.stroke();
	};

	// Function called when the user stops drawing, used to stop the drawing process when the user releases the mouse button or lifts their finger from the touchscreen. It sets the drawing variable to false, and this will prevent the draw function from drawing any more lines until the user starts drawing again. This is necessary to ensure that lines aren't drawn when the user moves the mouse or their finger across the canvas without pressing the mouse button or touching the screen.
	const endDrawing = (event: MouseEvent | TouchEvent) => {
		// Call preventDefault to stop any default behavior from the browser.
		// This might include things like scrolling the page when you're trying to draw.
		event.preventDefault();

		// If the user isn't currently drawing, exit the function. This is a safety measure,
		// in case the event listeners that call this function somehow get triggered even though
		// the user isn't drawing.
		if (!drawing) return;

		// Set the drawing variable to false. This indicates that the user is no longer drawing.
		// This will stop the draw function from drawing any further lines until the user starts drawing again.
		drawing = false;
	};

	// Function to save the current sketch to Firestore, primarily responsible for saving a completed sketch. It first saves the sketch to the Firestore collection, then it updates the local state with the new sketch, clears the canvas for a fresh drawing and displays a brief notification to indicate the successful operation.
	const saveSketch = async () => {
		// We check if the canvas or context is null, if so, we can't continue with saving the sketch.
		// This could happen if there's been a problem initializing the canvas or context.
		if (canvas === null || ctx === null) return;

		// We then save the sketch to the Firestore collection.
		// addDoc is a Firestore function that adds a document to a specified collection.
		// In this case, we're adding the current drawing actions to the sketch collection.
		await addDoc(sketchCollection, { drawingActions });

		// Here we add the new sketch to our local sketches array.
		// The spread operator (...) is used to create a new array, where we spread the existing sketches and add the new one.
		// We also spread drawingActions to create a copy of it when adding to sketches.
		sketches = [...sketches, [...drawingActions]];

		// Now we clear the canvas and the drawing actions array.
		// clearRect() method clears the canvas over the specified rectangle, here it's the whole canvas.
		// beginPath() method starts a new path. It's used here to clear any current drawing path that may be present.
		// We also set the length of the drawingActions array to 0, which effectively clears it.
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.beginPath();
		drawingActions.length = 0;

		// Here we show a notification to the user that their sketch has been saved.
		// We set showNotification to true, which would trigger any UI changes based on this.
		showNotification = true;

		// Finally, we set a timer to hide the notification after 2 seconds.
		// This is done by setting showNotification back to false after 2 seconds (2000 milliseconds).
		setTimeout(() => {
			showNotification = false;
		}, 2000);
	};

	// Fetch all the sketches from Firestore when the component is first mounted,used to initialize the state of the component when it is first rendered. In this case, it retrieves the existing sketches from the Firestore database and sets a flag to indicate that the component has been mounted.
	// onMount is a lifecycle function provided by Svelte that runs when the component first renders in the DOM.
	// Here, we use it to perform some initialization tasks.
	onMount(() => {
		// We declare an async function called fetchSketches within the onMount function.
		// This function is responsible for retrieving the existing sketches from the Firestore database.
		const fetchSketches = async () => {
			// We use the getDocs function from Firestore to get all documents from the sketchCollection.
			const sketchDocs = await getDocs(sketchCollection);
			// We then map over the documents, extracting the drawingActions from each document.
			// The result is an array of drawingActions arrays, which we assign to the sketches variable.
			sketches = sketchDocs.docs.map((doc) => doc.data().drawingActions);
		};
		// We call the fetchSketches function to initiate the fetching process.
		// As fetchSketches is asynchronous, it returns a promise that will resolve when the fetching is complete.
		fetchSketches();
		// We set the mounted variable to true.
		// This variable can be used to prevent certain actions from taking place until the component has mounted.
		// For example, we might want to avoid interacting with the canvas element until the component has fully mounted.
		mounted = true;
	});

	// After each component update, check if the canvas has been set. If so, add the event listeners, used to interact with the canvas and its rendering context and set up event listeners for user interaction. This is necessary to enable drawing on the canvas. Note that this function only sets up these interactions and listeners after the component has fully mounted and the canvas element exists.
	// The afterUpdate function is a lifecycle hook provided by Svelte. It runs after each update cycle.
	// In this context, an update is triggered whenever the reactive state of the component changes.
	// We use this function to interact with the canvas and its context, and to set up event listeners for user interactions.
	afterUpdate(() => {
		// Before setting up event listeners or interacting with the canvas, we check if the component is mounted and if the canvas exists.
		if (mounted && canvas) {
			// We get the 2D rendering context of the canvas. This context provides methods and properties to draw on the canvas.
			ctx = canvas.getContext('2d');
			// If getting the context failed for some reason (it should not in normal circumstances), we stop execution of the function.
			if (!ctx) return;
			// Now we add several event listeners to the canvas to handle user interactions.
			// These event listeners detect mouse and touch events to allow drawing on the canvas.
			// mousedown and touchstart events trigger the start of a drawing action.
			canvas.addEventListener('mousedown', startDrawing);
			canvas.addEventListener('touchstart', startDrawing);
			// mousemove and touchmove events track the user's movement on the canvas while drawing.
			canvas.addEventListener('mousemove', draw);
			canvas.addEventListener('touchmove', draw);
			// mouseup, mouseout and touchend events signal the end of a drawing action.
			canvas.addEventListener('mouseup', endDrawing);
			canvas.addEventListener('mouseout', endDrawing);
			canvas.addEventListener('touchend', endDrawing);
		}
	});

	// When the component is destroyed, remove the event listeners from the canvas, used to clean up after the component when it is about to be destroyed. This includes removing event listeners that were added when the component was initialized or updated. This helps prevent memory leaks and unexpected behavior.
	// This is a Svelte lifecycle function that gets triggered when a component is being destroyed
	onDestroy(() => {
		// First, we check if the canvas element exists
		if (canvas) {
			// If the canvas element exists, we remove the event listeners we previously added to it.
			// This is a good practice to prevent memory leaks as it releases the memory resources used by these event listeners.
			// It's also crucial to prevent unexpected behavior, as these event listeners might continue listening for events and
			// executing their associated functions even after the component has been unmounted if they're not properly removed.
			canvas.removeEventListener('mousedown', startDrawing);
			canvas.removeEventListener('mousemove', draw);
			canvas.removeEventListener('mouseup', endDrawing);
			canvas.removeEventListener('mouseout', endDrawing);
			canvas.removeEventListener('touchstart', startDrawing);
			canvas.removeEventListener('touchmove', draw);
			canvas.removeEventListener('touchend', endDrawing);
		}
	});

	// Function to render a sketch on a canvas. It's passed to the 'use' directive in the markup below, a function that takes a canvas node and an array of drawing actions. It uses the context of the canvas to apply these actions, effectively rendering the sketch onto the canvas.
	// This function is responsible for rendering the sketch on the canvas
	function renderSketch(node: HTMLCanvasElement, [drawingActions]: [DrawingAction[]]) {
		// It gets the 2D rendering context for the canvas
		// This context can be used to draw shapes, text, images, and other objects on the canvas
		const context = node.getContext('2d');

		// If there's no context (which might happen if the canvas doesn't support 2D rendering), the function returns immediately
		if (!context) {
			return;
		}

		// It clears the entire canvas, making it completely transparent
		context.clearRect(0, 0, node.width, node.height);

		// It starts a new path by emptying the list of sub-paths
		// Call this method when you want to create a new path
		context.beginPath();

		// It sets the color used for strokes
		context.strokeStyle = 'black';

		// It sets the thickness of lines
		context.lineWidth = 2;

		// The function then loops over each action in the drawingActions array
		for (const action of drawingActions) {
			// If the action type is 'moveTo', it changes the starting position of the new sub-path to the (x, y) coordinates
			if (action.type === 'moveTo') {
				context.moveTo(action.x, action.y);
			}

			// If the action type is 'lineTo', it connects the last point in the sub-path to the specified (x, y) coordinates with a straight line
			else if (action.type === 'lineTo') {
				context.lineTo(action.x, action.y);
				context.stroke(); // It actually draws the path you have defined with all those moveTo() and lineTo() methods
			}
		}

		// The closePath() method creates a path from the current point back to the starting point
		// This function is often used to create scalable and efficient 2D shapes for the <canvas> element
		context.closePath();
	}
</script>

<main>
	<!-- The parent div container for the whole application -->
	<div class="app-container">
		<!-- A div that holds the sketch pad and its functionalities -->
		<div class="sketch-container">
			<!-- Heading for the sketch pad -->
			<h1>Sketch Pad</h1>

			<div class="sketchpad">
				<!-- The canvas where the user can sketch.
		    `bind:this={canvas}` binds the DOM node to the `canvas` variable in the component's script. -->
				<canvas bind:this={canvas} width="400" height="400" />

				<!-- Button for saving the sketch.
			When the button is clicked, it calls the `saveSketch` function. -->
				<button class="button" on:click={saveSketch}>Save Sketch</button>
			</div>
		</div>

		<!-- A div to display a gallery of saved sketches -->
		<div class="gallery">
			<!-- For each sketch in the `sketches` array, it renders a canvas with the sketch.
	    `{#each sketches as sketch (sketch)}` is a Svelte block that loops over the `sketches` array.
	    `(sketch)` is a key expression which uniquely identifies each sketch. -->
			{#each sketches as sketch (sketch)}
				<!-- The canvas is rendered with the given sketch using the `renderSketch` action function.
			`use:renderSketch={[sketch]}` attaches the `renderSketch` action to the canvas element. -->
				<canvas class="gallery-item" use:renderSketch={[sketch]} width="400" height="400" />
			{/each}
		</div>

		<!-- A div to show a notification when a sketch is saved.
	`class:active={showNotification}` adds the `active` class to the div when `showNotification` is true. -->
		<div class="notification" class:active={showNotification}>Sketch saved!</div>
	</div>
</main>

<style>
	/* A global rule that applies to the entire body of the document. This sets the margin, background color, font family, and overflow property for the whole page */
	:global(body) {
		margin: 0;
		background-color: rgb(192, 194, 172);
		font-family: Arial, Helvetica, sans-serif;
		overflow: hidden;
	}

	/* CSS rules for the parent div that contains the whole app. It is displayed as a grid with two rows of equal size, and its height covers the entire viewport height */
	.app-container {
		display: grid;
		grid-template-rows: 1fr 1fr;
		height: 100vh;
	}

	/* CSS rules for the sketch-container div. It is displayed as a column of elements, and its items are centered both horizontally and vertically */
	.sketch-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* CSS rule for the h1 element. It adds a bottom margin */
	h1 {
		margin-bottom: 20px;
	}

	/* CSS rules for all canvas elements. They have a white background and a black border */
	canvas {
		background-color: white;
		border: 1px solid black;
	}

	/* CSS rules for buttons. They have a top margin, some padding, no border, a white background, and a pointer cursor */
	.button {
		margin-top: 20px;
		padding: 10px 20px;
		border: none;
		background-color: white;
		cursor: pointer;
		height: 10%; /* The button height is set to be 10% of its parent container */
	}

	/* CSS rule for the active state of buttons. The background color changes when the button is actively being clicked */
	.button:active {
		background-color: #ddd;
	}

	/* CSS rules for the gallery div. It is displayed as a row of elements that can wrap to the next line. Its items are centered, and it allows scrolling if the content overflows */
	.gallery {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		overflow: auto;
		padding: 10px;
	}

	/* CSS rules for each canvas in the gallery. They have a fixed size, a margin, and a border */
	.gallery-item {
		width: 100px;
		height: 100px;
		margin: 10px;
		border: 1px solid black;
	}

	/* CSS rules for the notification div. It is positioned at a fixed place at the top-right corner of the page, with some padding and round corners. It is initially invisible (opacity 0), but can become visible with a transition */
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

	/* CSS rule for the active state of the notification div. The opacity becomes 1, making the div visible */
	.notification.active {
		opacity: 1;
	}
</style>
