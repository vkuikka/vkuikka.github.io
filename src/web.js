import * as input from "./input.js"

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

window.addEventListener('DOMContentLoaded', (event) => {

	var color = 0x203050;
	var background = 0x303030;
	color = 0x000000;
	background = color;
	scene.fog = new THREE.Fog(color, -300, 600);

	scene.background = new THREE.Color(background);

	// const light = new THREE.AmbientLight( 0x202020 );
	const light1 = new THREE.DirectionalLight(0x252525, 1);

	scene.add( light1 );

	var cube = new Array();
	var obj_amount = 40;
	loader.load("/objects/ball.obj",
		function (obj) {
			var	cpy;
			obj.traverse( function ( child ) {
				if ( child instanceof THREE.Mesh ) {
					// child.material.ambient.setHex(0xFF0000);
					// child.material.color.setHex(0xffffff);
					// child.material.specular.setHex(0xffffff);
					cpy = child.clone();
			}});
			for (let x = 0; x < obj_amount; x++)
				for (let y = 0; y < obj_amount; y++) {
					cube[x + y*obj_amount] = cpy.clone();
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
					cube[x + y*obj_amount].position.set(
														xran[0] + (xr * xran[1] * 2),
														yran[0] + (yr * yran[1] * 2),
														zran[0] + (zr * zran[1] * 2));
					cube[x + y*obj_amount].scale.set(10, 10, 10);
					cube[x + y*obj_amount].material.color.setHex(0xffffff);
					cube[x + y*obj_amount].material.specular.setHex(0xffffff);

					// child.material.color.setHex(0xffffff);
					// child.material.specular.setHex(0xffffff);
					scene.add(cube[x + y * obj_amount]);
				}
		},
		function (prog) {console.log("object " + parseInt(prog.loaded / prog.total * 100) + '% loaded');},
		function (error) {console.log("ERROR: failed to load OBJ file");}
	);
	// var point1 = new THREE.PointLight(0x04cdff, 1, 500);
	// var point2 = new THREE.PointLight(0xdf5757, 1, 500);
	// var point1 = new THREE.PointLight(0x332255, 1, 400);
	// var point2 = new THREE.PointLight(0x113355, 1, 400);
	// scene.add(point1);
	// scene.add(point2);
	// point1.position.set(50, 0, -5);
	// point2.position.set(-50, 0, -5);

	window.addEventListener("scroll", input.onMouseWheel, false);
	window.addEventListener("mousemove", input.onMouseMove, false);
	window.addEventListener("keydown", input.onKeyDown, false);

	renderer.setSize(window.innerWidth, window.innerHeight);

	// Rotation amounts for each obj
	let x_rands = new Array();
	let y_rands = new Array();
	for (var i = 0; i < obj_amount * obj_amount; i++)
	{
		x_rands[i] = Math.random();
		while (x_rands[i] > 0.2 && x_rands[i] < 0.8)
			x_rands[i] = Math.random();
		y_rands[i] = Math.random();
		while (y_rands[i] > 0.2 && y_rands[i] < 0.8)
			y_rands[i] = Math.random();
	}
	light1.position.set(camera.position.x, camera.position.y, camera.position.z + 10).normalize();
	// camera.rotation.x = Math.PI / 4;
	function animate() {
		for (let i = 0; i < cube.length; i++)
		{
			cube[i].rotation.x += (x_rands[i] - 0.5) * 0.05;
			cube[i].rotation.y += (y_rands[i] - 0.5) * 0.05;
		}
		// var dist = 250;
		// light1.position.set(camera.position.x, camera.position.y, camera.position.z + 10).normalize();
		// light1.position.set( 1, 1, 1 ).normalize();
		// point2.position.set(camera.position.x + dist, camera.position.y, camera.position.z - 10);

		resizeCanvasToDisplaySize();
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}
	animate();
});
