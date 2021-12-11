import {camera} from './web.js';

export function onMouseMove(event) {
	var mouse = new THREE.Vector2();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = (event.clientY / window.innerHeight) * 2 + 1;
	return mouse;
}

export function onKeyDown(event) {
	var keyCode = event.which;
	var speed = 10;

	console.log(keyCode, "pressed");
	if (keyCode == 87) {
		camera.position.z -= speed;
	} else if (keyCode == 83) {
		camera.position.z += speed;
	} else if (keyCode == 65) {
		camera.position.x -= speed;
	} else if (keyCode == 68) {
		camera.position.x += speed;
	}
	return (camera)
}

export function onMouseWheel(event) {
	camera.position.z = -window.scrollY / 2;

	// camera.rotation.x = -window.scrollY / 100;
	// camera.rotation.y = -window.scrollY / 1000;
	camera.rotation.z = -window.scrollY / 1000;
}
