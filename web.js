var		loadedObject;
const	scene = new THREE.Scene();
function loadOBJ(path, loader) {
	loader.load(path,
		function (obj) {
			loadedObject = obj;
			obj.scale.set(1, 1, 1);
			scene.add(obj);
		},
		function (xhr) {
			console.log("object " + parseInt(xhr.loaded / xhr.total * 100) + '% loaded');
		},
		function (error) {
			console.log("ERROR: failed to load OBJ file");
		}
	);
}

window.addEventListener('DOMContentLoaded', (event) => {

	const	renderer = new THREE.WebGLRenderer({canvas: document.querySelector("canvas")});
	const	camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
	const	loader = new THREE.OBJLoader();


	loadOBJ("http://localhost/web/src/objects/stanford_bunny.obj", loader);


	//world.renderer.setSize(window.innerWidth, window.innerHeight);
	//document.body.appendChild(world.renderer.domElement);

	var boxGeom = new THREE.BoxGeometry();
	var boxMat = new THREE.MeshPhongMaterial({
	  color: 0xffffff,
	  specular: 0xffffff,
	  shininess: 60
	});

	var cube = new THREE.Mesh(boxGeom, boxMat);


	var point1 = new THREE.PointLight(0x04cdff, 1, 100);
	var point2 = new THREE.PointLight(0xdf5757, 1, 100);

	point1.position.set(5, 0, -5);
	scene.add(point1);

	point2.position.set(-5, 0, -5);
	scene.add(point2);

	cube.position.set(0, 0, -1000);
	cube.scale.set(8, 8, 8);
	scene.add(cube);

	camera.position.z = 10;

	var mouse = new THREE.Vector2();	
	function onMouseMove(event) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = (event.clientY / window.innerHeight) * 2 + 1;
	}

	function onMouseWheel(event) {
		event.preventDefault();

	//	camera.position.y -= event.deltaY * 0.005;
		loadedObject.rotation.x += 0.1;
		
	//	camera.position.clampScalar( 0, 10 );

		console.log("scrolling");
	}

	function resizeCanvasToDisplaySize() {
	  const canvas = renderer.domElement;
	  const width = canvas.clientWidth;
	  const height = canvas.clientHeight;

	  // adjust displayBuffer size to match
	  if (canvas.width !== width || canvas.height !== height) {
		// must pass false here or three.js sadly fights the browser
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		// update any render target sizes here
	  }
	}

	window.addEventListener("scroll", onMouseWheel);
	window.addEventListener("mousemove", onMouseMove, false);

	width = window.innerWidth;
	height = window.innerHeight;
	renderer.setSize(width, height);
	function animate() {
	//	width = window.innerWidth;
	//	height = window.innerHeight;
	//	renderer.setSize(width, height);
		requestAnimationFrame(animate);


		cube.rotation.x += 0.01;
		cube.rotation.y -= 0.01;

		renderer.render(scene, camera);
		if (loadedObject != null && loadedObject.material != boxMat)
			loadedObject.material = boxMat;
		else if (loadedObject != null)
			loadedObject.rotation.y += 0.002;

	//	resizeCanvasToDisplaySize();
	}
	animate();

});
