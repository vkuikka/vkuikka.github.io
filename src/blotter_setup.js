$('.blotter').each(function( index ) {
	let elem = $(this).get(0);
	let original = elem.textContent;

	try {
		let text = new Blotter.Text(original, {
			family: 'Abhaya Libre, serif',
			size : 54,
			paddingLeft: '30',
			paddingRight: '30',
			fill : "#ffffff"
		});

		var material = new Blotter.LiquidDistortMaterial();
		material.uniforms.uSpeed.value = 0.5;
		material.uniforms.uVolatility.value = 0.01;
		material.uniforms.uSeed.value = index;

		var blotter = new Blotter(material, { texts : text });
		var scope = blotter.forText(text);

		// Only drop the plain text once the WebGL effect is ready, so a failure
		// above leaves the heading readable instead of blank.
		elem.textContent = '';
		scope.appendTo(elem);

		function lerp(a, b, n) {return((1 - n) * a + n * b)}

		let scrolled = 0;
		function blotter_scroll(event) {
			scrolled += event.deltaY;
		}
		window.addEventListener('wheel', blotter_scroll);

		let volatility = 0;

		function moveIt(event) {
			volatility = lerp(volatility, scrolled / 200, 0.05);
			material.uniforms.uVolatility.value = volatility + 0.02;
			scrolled = 0;
			requestAnimationFrame(moveIt);
		}
		moveIt();
	} catch (err) {
		// WebGL unavailable: keep the heading as plain text.
		elem.textContent = original;
		console.error('Heading text effect unavailable; using plain text.', err);
	}
});
