import { camera } from './web.js';
import { maxScroll } from './pages.js';

export function onMouseMove(event) {
	var mouse = new THREE.Vector2();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = (event.clientY / window.innerHeight) * 2 - 1;

	camera.rotation.y = -mouse.x / 60;
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

export var scroll = 0;
let lastY = 0;

export function touchStart(event) {
	lastY = event.touches[0].clientY;
}

export function scrollCamera(event) {
	if (!event)
	{
		scroll = 0;
		return;
	}
	else {
		let	deltaY;
		if (event.type == "wheel")
			deltaY = event.deltaY;
		if (event.type == "touchmove") {
			deltaY = lastY - event.touches[0].clientY;
			lastY = event.touches[0].clientY;
		}
		if ((scroll > 0 || deltaY > 0) && (scroll < maxScroll || deltaY < 0))
			scroll += deltaY;
	}
	camera.position.z = -scroll * 0.1;
	camera.rotation.z = -scroll * 0.0002;
}
