import { camera } from './web.js';
import { max_scroll } from './phase.js';

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

let scroll = 0;

export function onMouseWheel(event) {
	if (!event)
	{
		scroll = 0;
		return;
	}
	else {
		if ((scroll > 0 || event.deltaY > 0) && (scroll < max_scroll || event.deltaY < 0))
			scroll += event.deltaY;
	}
	camera.position.z = -scroll * 0.1;
	camera.rotation.z = -scroll * 0.0002;
}
