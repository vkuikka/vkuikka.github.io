import {camera} from './web.js';

export function onMouseMove(event) {
	var mouse = new THREE.Vector2();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = (event.clientY / window.innerHeight) * 2 - 1;

	camera.rotation.y = -mouse.x / 60;
	// camera.rotation.z = -mouse.y / 30;
	return mouse;
}

export function onKeyDown(event) {
	var keyCode = event.which;
	var speed = 10;

	console.log(keyCode, "pressed");
	if (keyCode == 38) {
		camera.position.z -= speed;
		event.preventDefault();
	} else if (keyCode == 40) {
		camera.position.z += speed;
		event.preventDefault();
	} else if (keyCode == 37) {
		camera.position.x -= speed;
		event.preventDefault();
	} else if (keyCode == 39) {
		camera.position.x += speed;
		event.preventDefault();
	}
	return (camera)
}

export function onMouseWheel(event) {
	camera.position.z = -window.scrollY / 3;
}
