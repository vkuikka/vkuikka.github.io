// Ambient background: a static field of slowly tumbling low-poly spheres.
// The 3D scene is a progressive enhancement. If WebGL is missing or three.js
// fails, the catch still reveals the page over the solid black background.

window.addEventListener('DOMContentLoaded', () => {
	try {
		const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
		const scene = new THREE.Scene();
		const renderer = new THREE.WebGLRenderer({canvas: document.querySelector("canvas"), antialias: true});

		const color = 0x000000;
		scene.fog = new THREE.Fog(color, -300, 600);
		scene.background = new THREE.Color(color);

		const light = new THREE.DirectionalLight(0x252525, 1);
		light.position.set(0, 0, 10).normalize();
		scene.add(light);

		// One shared geometry + material for every sphere. flatShading keeps the
		// facets visible so the slow rotation reads as a subtle shimmer.
		const geometry = new THREE.IcosahedronGeometry(10, 0);
		const material = new THREE.MeshPhongMaterial({color: 0xffffff, specular: 0xffffff, flatShading: true});

		const balls = new Array();
		const spin = new Array();
		const objAmount = 30;

		for (let i = 0; i < objAmount * objAmount; i++) {
			let xr = Math.random();
			let yr = Math.random();
			let zr = Math.random();
			// keep the centre clear so the text stays readable
			while (xr > 0.45 && xr < 0.55 && yr > 0.45 && yr < 0.55) {
				xr = Math.random();
				yr = Math.random();
			}

			const ball = new THREE.Mesh(geometry, material);
			ball.position.set(-300 + xr * 600, -300 + yr * 600, -zr * 600);
			ball.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
			scene.add(ball);
			balls.push(ball);

			// rotation speed, biased away from zero so nothing sits perfectly still
			let sx = Math.random();
			while (sx > 0.2 && sx < 0.8) sx = Math.random();
			let sy = Math.random();
			while (sy > 0.2 && sy < 0.8) sy = Math.random();
			spin.push([(sx - 0.5) * 0.02, (sy - 0.5) * 0.02]);
		}

		renderer.setSize(window.innerWidth, window.innerHeight, false);

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

		// Scrolling doesn't move the page (it can't; the body is fixed). Instead the
		// wheel delta feeds a decaying boost that briefly speeds up the spin, the same
		// way the heading text warps when you scroll.
		let scrollAccum = 0;
		let spinBoost = 0;
		window.addEventListener('wheel', (e) => { scrollAccum += Math.abs(e.deltaY); }, {passive: true});

		function lerp(a, b, n) { return (1 - n) * a + n * b; }

		function animate() {
			spinBoost = lerp(spinBoost, scrollAccum / 120, 0.12);
			scrollAccum = 0;
			const speed = 1 + spinBoost;

			for (let i = 0; i < balls.length; i++) {
				balls[i].rotation.x += spin[i][0] * speed;
				balls[i].rotation.y += spin[i][1] * speed;
			}
			resizeCanvasToDisplaySize();
			renderer.render(scene, camera);
			requestAnimationFrame(animate);
		}
		animate();
	} catch (err) {
		console.error('3D background unavailable; showing the page on a solid black background.', err);
	} finally {
		document.body.style.visibility = "visible";
	}
});
