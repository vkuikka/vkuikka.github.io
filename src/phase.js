let	scroll = 0;

export function	main_scroll(event) {
	if (!event)
		scroll = 0;
	else
		scroll += event.deltaY;

	console.log(scroll);
	const dist_between = -100;
	const speed = 0.1;

	$( ".pages" ).each(function( index ) {
		let dist = scroll * speed + index * dist_between;
		if (dist > 1)
			dist *= dist * speed;

		let movez = String(dist * 0.75) + "px";

		let movex = 0;
		let movey = 0;
		let alpha = 1;
		let angle = 0;
		if (dist > 0)
		{
			if (index % 2)
			{
				movex = String(dist * 1.2) + "px";
				angle = String(-dist * 0.2) + "deg";
			}
			else
			{
				movex = String(-dist * 1.2) + "px";
				angle = String(dist * 0.2) + "deg";
			}
			alpha = String(1- (dist * 0.02));
		}

		let transforms = "";
		transforms += "perspective(200px) ";
		transforms += "scale3d(1,1,1) ";
		transforms += "translate3d(" + movex + "," + movey + "," + movez + ")";
		transforms += "rotateY(" + angle +") ";
		$(this).css("color", "rgba(255,255,255," + alpha + ")");
		$(this).css("transform", transforms);
		$(this).css("z-index", String(5-index));
	});
}
