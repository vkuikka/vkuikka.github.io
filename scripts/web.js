import * as input from "./input.js"
export const	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
import { loadOBJ } from "./init.js";

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

window.addEventListener('DOMContentLoaded', (event) => {

	var color = 0x203050;
	var background = 0x303030;
	background = color;
	scene.fog = new THREE.Fog(color, -300, 600);
	// scene.fog = new THREE.FogExp2(background, 0.004);

	scene.background = new THREE.Color(background);

	// const light = new THREE.AmbientLight( 0x202020 );
	// const light1 = new THREE.DirectionalLight( 0x00ffff, 1);
	// const light2 = new THREE.DirectionalLight( 0xff00ff, 0.1);

	// scene.add( light1 );
	// scene.add( light2 );

	var cube = new Array();
	var cubeAmount = 50;
	loader.load("/objects/ball.obj",
		function (obj) {
			var	cpy;
			obj.traverse( function ( child ) {
				if ( child instanceof THREE.Mesh ) {
					// child.material.ambient.setHex(0xFF0000);
					child.material.color.setHex(0xffffff);
					// child.material.specular.setHex(0xffffff);
					cpy = child.clone();
			}});
			for (let x = 0; x < cubeAmount; x++)
				for (let y = 0; y < cubeAmount; y++) {
					cube[x + y*cubeAmount] = cpy.clone();
					// cube[x + y*cubeAmount].position.set(30 * x, -150 + (Math.random() * 300), -30 * y);
					var xr = Math.random();
					var yr = Math.random();
					var zr = Math.random();
					while (xr > 0.45 && xr < 0.55 && yr > 0.45 && yr < 0.55)
					{
						xr = Math.random();
						yr = Math.random();
					}
					cube[x + y*cubeAmount].position.set(
														-300 + (xr * 600),
														-300 + (yr * 600),
														0 + (zr * -1900),
														);
					cube[x + y*cubeAmount].scale.set(10, 10, 10);
					scene.add(cube[x + y * cubeAmount]);
				}
		},
		function (prog) {console.log("object " + parseInt(prog.loaded / prog.total * 100) + '% loaded');},
		function (error) {console.log("ERROR: failed to load OBJ file");}
	);

	// camera.position.z = 100;

	// var boxGeom = new THREE.BoxGeometry();
	// var boxMat = new THREE.MeshPhongMaterial({
	// 	color: 0xffffff,
	// 	specular: 0xffffff,
	// 	shininess: 60
	// });

	// var point1 = new THREE.PointLight(0x04cdff, 1, 500);
	// var point2 = new THREE.PointLight(0xdf5757, 1, 500);

	// var point1 = new THREE.PointLight(0x0000ff, 1, 400);
	// var point2 = new THREE.PointLight(0xff0000, 1, 400);
	
	var point1 = new THREE.PointLight(0x332255, 1, 400);
	var point2 = new THREE.PointLight(0x113355, 1, 400);

	scene.add(point1);
	scene.add(point2);
	// point1.position.set(50, 0, -5);
	// point2.position.set(-50, 0, -5);


	window.addEventListener("scroll", input.onMouseWheel);
	window.addEventListener("mousemove", input.onMouseMove, false);
	window.addEventListener("keydown", input.onKeyDown, false);

	renderer.setSize(window.innerWidth, window.innerHeight);


	let x_rands = new Array();
	let y_rands = new Array();
	for (var i = 0; i < cubeAmount * cubeAmount; i++)
	{
		x_rands[i] = Math.random();
		while (x_rands[i] > 0.2 && x_rands[i] < 0.8)
			x_rands[i] = Math.random();
		y_rands[i] = Math.random();
		while (y_rands[i] > 0.2 && y_rands[i] < 0.8)
			y_rands[i] = Math.random();
	}

	function animate() {
		requestAnimationFrame(animate);

		for (let i = 0; i < cube.length; i++)
		{
			cube[i].rotation.x += (x_rands[i] - 0.5) * 0.05;
			cube[i].rotation.y += (y_rands[i] - 0.5) * 0.05;
		}

		// if (loadedObject != null)
		// 	loadedObject.rotation.y += 0.002;
		var dist = 250;
		point1.position.set(camera.position.x - dist, camera.position.y, camera.position.z - 10);
		point2.position.set(camera.position.x + dist, camera.position.y, camera.position.z - 10);

		resizeCanvasToDisplaySize();
		renderer.render(scene, camera);
	}
	animate();

});
