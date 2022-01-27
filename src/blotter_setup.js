import * as input from "./input.js"

var elem = document.getElementById("blotter_container");

var text = new Blotter.Text(elem.textContent, {
	// family : "serif",
	// family: "EB Garamond, serif",
	// family : "sans",
	// family: "Fira Code",
	family: "Gill Sans, sans-serif",
	size : 50,
	paddingLeft: '30',
	paddingRight: '30',
	fill : "#ffffff"
});
elem.textContent = '';

var material = new Blotter.LiquidDistortMaterial();
material.uniforms.uSpeed.value = 0.5;
material.uniforms.uVolatility.value = 0.01;
material.uniforms.uSeed.value = 0.2;

// var material = new Blotter.ChannelSplitMaterial();
// material.uniforms.uOffset.value = 0.1;
// material.uniforms.uRotation.value = 0;
// material.uniforms.uApplyBlur.value = 1;
// material.uniforms.uAnimateNoise.value = 0.3;

var blotter = new Blotter(material, { texts : text });
var scope = blotter.forText(text);
scope.appendTo(elem);

// document.onmousemove = moveIt;
// document.onscroll = moveIt;

const MathUtils = {
	// Equation of a line.
	lineEq: (y2, y1, x2, x1, currentVal) => {
	  var m = (y2 - y1) / (x2 - x1), b = y1 - m * x1;
	  return m * currentVal + b;
	},
	// Linear Interpolation function.
	lerp: (a, b, n) =>  (1 - n) * a + n * b
  };

const uniformValuesRange = [0.01, 0.3];

let currentScroll = 0;

function blotter_scroll(event) {
	currentScroll += event.deltaY;
}
window.addEventListener('wheel', blotter_scroll);

let volatility = 0;

const maxscroll = 10;


function moveIt(event) {
	// var mouse = new THREE.Vector2();
	// mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	// mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
	// var len = mouse.length();

	// material.uniforms.uOffset.value = Math.abs(speed / 100) + 0.0001;
	// material.uniforms.uRotation.value = speed + 0.5;
	const newScroll = 0;
	const scrolled = Math.abs(newScroll - currentScroll);


	volatility =  MathUtils.lerp(volatility, Math.min(MathUtils.lineEq(uniformValuesRange[1], uniformValuesRange[0], maxscroll, 0, scrolled), 0.9), 0.05);

	material.uniforms.uVolatility.value = volatility;
	currentScroll = newScroll;

	// material.uniforms.uVolatility.value = Math.abs(speed / 200) + 0.05;
	// material.uniforms.uSeed.value += speed / 100;
	requestAnimationFrame(moveIt);

	// material.uniforms.uRotation.value = (event.clientX * .2);
	// material.uniforms.uOffset.value = (event.clientY * 0.00025);
	// material.uniforms.uRotation.value = len * 30;
	// material.uniforms.uOffset.value = len / 15;

	// material.uniforms.uRotation.value = window.scrollY;
	// material.uniforms.uOffset.value = 0.1;

	// material.uniforms.uRotation.value = mouse.x * 100;
	// material.uniforms.uOffset.value = Math.abs(mouse.y / 10);
}
moveIt();
