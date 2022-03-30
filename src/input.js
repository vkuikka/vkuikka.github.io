import { camera } from './web.js';
import { maxScroll } from './pages.js';

export function onMouseMove(event) {
	var mouse = new THREE.Vector2();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
	return mouse;
}

export function onKeyDown(event) {
	var keyCode = event.which;
	var speed = 10;

	if (keyCode == 38)
		camera.position.z -= speed;
	else if (keyCode == 40)
		camera.position.z += speed;
	else if (keyCode == 37)
		camera.position.x -= speed;
	else if (keyCode == 39)
		camera.position.x += speed;
	return (camera)
}

export var scroll = 0;
let	scrollTarget = 0;
let	lastY = 0;
let	lastScrollTime = 0;

export function touchStart(event) {
	lastY = event.touches[0].clientY;
}

export function scrollCamera(event) {
	let move = false

	if (!event) {
		scroll = 0;
		scrollTarget = 0;
		return;
	} else {
		let	deltaY;
		if (event.type == "wheel") {
			deltaY = event.deltaY;
			if (Math.abs(event.deltaY) > Math.abs(lastY) && Date.now() > lastScrollTime + 1000) {
				lastScrollTime = Date.now()
				move = true
			}
			else if ((deltaY > 0 && lastY < 0) || (deltaY < 0 && lastY > 0)) {
				lastScrollTime = Date.now()
				move = true
			}
			lastY = event.deltaY;
		}
		if (event.type == "touchmove") {
			deltaY = lastY - event.touches[0].clientY;
			lastY = event.touches[0].clientY;
			move = true
		}
		if (move) {
			if ((scrollTarget + deltaY > 0 ^ deltaY > 0) || (scrollTarget + deltaY < maxScroll ^ deltaY < 0))
				scrollTarget = getScrollTarget(deltaY);
			else if (scrollTarget + deltaY > maxScroll)
				scrollTarget = maxScroll
			else if (scrollTarget + deltaY < 0)
				scrollTarget = 0
		}
	}
}

function lerp(a, b, n) {return((1 - n) * a + n * b)}

function getScrollTarget(deltaY) {
	let len = $('.pages').length;
	let closest = 424242;
	let i = 0
	let	distBetween = maxScroll / len + 160;
	let target = 0;

	while (i < len) {
		let dist = i * distBetween
		if (Math.abs(scroll - dist) < closest) {
			closest = Math.abs(scroll - dist)
			if (deltaY > 0 && i < len - 1)
				target = dist + distBetween
			else if (deltaY < 0 && i > 0)
				target = dist - distBetween
		}
		i++;
	}
	return (target)
}

export function smoothScroll() {
	scroll = lerp(scroll, scrollTarget, 0.05);

	camera.position.z = -scroll * 0.15;
	// camera.rotation.z = -scroll * 0.0002;
}
