$('.blotter').each(function( index ) {
	let elem = $(this).get(0);
	let text = new Blotter.Text(elem.textContent, {
		family: 'Abhaya Libre, serif',
		size : 30,
		paddingLeft: '30',
		paddingRight: '30',
		fill : "#ffffff"
	});
	elem.textContent = '';

	var material = new Blotter.LiquidDistortMaterial();
	material.uniforms.uSpeed.value = 0.5;
	material.uniforms.uVolatility.value = 0.01;
	material.uniforms.uSeed.value = index;

	// var material = new Blotter.ChannelSplitMaterial();
	// material.uniforms.uOffset.value = 0.1;
	// material.uniforms.uRotation.value = 0;
	// material.uniforms.uApplyBlur.value = 1;
	// material.uniforms.uAnimateNoise.value = 0.3;

	var blotter = new Blotter(material, { texts : text });
	var scope = blotter.forText(text);
	scope.appendTo(elem);

	const MathUtils = {
		lineEq: (y2, y1, x2, x1, currentVal) => {
			var m = (y2 - y1) / (x2 - x1), b = y1 - m * x1;
			return m * currentVal + b;
		},
		lerp: (a, b, n) =>  (1 - n) * a + n * b
	};

	const uniformValuesRange = [0.01, 0.05];

	let scrolled = 0;
	function blotter_scroll(event) {
		scrolled += event.deltaY;
	}
	window.addEventListener('wheel', blotter_scroll);

	let volatility = 0;
	const maxscroll = 10;

	function moveIt(event) {
		volatility =  MathUtils.lerp(volatility, Math.min(MathUtils.lineEq(uniformValuesRange[1], uniformValuesRange[0], maxscroll, 0, scrolled), 0.9), 0.05);
		material.uniforms.uVolatility.value = volatility;
		scrolled = 0;
		requestAnimationFrame(moveIt);
	}
	moveIt();
});
