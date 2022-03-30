import * as input from "./input.js"
import * as pages from './pages.js';
import { handleVertical } from './vertical_screen.js';

input.scrollCamera(0);
export const	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);

const	scene = new THREE.Scene();
const	renderer = new THREE.WebGLRenderer({canvas: document.querySelector("canvas")});
const	loader = new THREE.OBJLoader();

function resizeCanvasToDisplaySize() {
	const canvas = renderer.domElement;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;

	if (canvas.width !== width || canvas.height !== height) {
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
}

if ($(window).width() < $(window).height())
	handleVertical();

window.addEventListener('DOMContentLoaded', (event) => {

	var color = 0x203050;
	var background = 0x303030;
	color = 0x000000;
	background = color;
	scene.fog = new THREE.Fog(color, -300, 600);

	scene.background = new THREE.Color(background);

	const light1 = new THREE.DirectionalLight(0x252525, 1);

	scene.add( light1 );

	var cube = new Array();
	var objAmount = 30;
	loader.load("/objects/ball.obj",
		function (obj) {
			var	cpy;
			obj.traverse( function ( child ) {
				if ( child instanceof THREE.Mesh ) {
					cpy = child.clone();
			}});
			for (let x = 0; x < objAmount; x++)
				for (let y = 0; y < objAmount; y++) {
					cube[x + y * objAmount] = cpy.clone();
					var xr = Math.random();
					var yr = Math.random();
					var zr = Math.random();
					while (xr > 0.45 && xr < 0.55 && yr > 0.45 && yr < 0.55)
					{
						xr = Math.random();
						yr = Math.random();
					}
					var xran = [-300, 300];
					var yran = [-300, 300];
					var zran = [0, -600];
					cube[x + y * objAmount].position.set(
						xran[0] + (xr * xran[1] * 2),
						yran[0] + (yr * yran[1] * 2),
						zran[0] + (zr * zran[1] * 2));
					cube[x + y * objAmount].scale.set(10, 10, 10);
					cube[x + y * objAmount].material.color.setHex(0xffffff);
					cube[x + y * objAmount].material.specular.setHex(0xffffff);
					scene.add(cube[x + y * objAmount]);
				}
		},
		function (prog) {console.log("object " + parseInt(prog.loaded / prog.total * 100) + '% loaded');},
		function (error) {console.log("ERROR: failed to load OBJ file");}
	);

	pages.scrollPages();
	window.addEventListener('wheel', pages.scrollPages, {passive:true});
	window.addEventListener('wheel', input.scrollCamera, {passive:true});

	window.addEventListener('touchstart', input.touchStart, {passive:true});
	window.addEventListener('touchmove', input.scrollCamera, {passive:true});
	window.addEventListener('touchmove', pages.scrollPages, {passive:true});

	window.addEventListener('mousemove', input.onMouseMove, {passive:true});
	window.addEventListener('keydown', input.onKeyDown, {passive:true});

	renderer.setSize(window.innerWidth, window.innerHeight);

	// Rotation amounts for each obj
	let xRands = new Array();
	let yRands = new Array();
	for (var i = 0; i < objAmount * objAmount; i++)
	{
		xRands[i] = Math.random();
		while (xRands[i] > 0.2 && xRands[i] < 0.8)
			xRands[i] = Math.random();
		yRands[i] = Math.random();
		while (yRands[i] > 0.2 && yRands[i] < 0.8)
			yRands[i] = Math.random();
	}
	light1.position.set(camera.position.x, camera.position.y, camera.position.z + 10).normalize();
	function animate() {
		input.smoothScroll();
		pages.scrollPages();
		for (let i = 0; i < cube.length; i++)
		{
			cube[i].rotation.x += (xRands[i] - 0.5) * 0.05;
			cube[i].rotation.y += (yRands[i] - 0.5) * 0.05;
		}
		resizeCanvasToDisplaySize();
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}
	animate();
});
