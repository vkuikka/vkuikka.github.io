export let	max_scroll = 999999;

export function	page_scroll(event) {
	if (!event)
		scroll = 0;
	else if ((scroll > 0 || event.deltaY > 0) && (scroll < max_scroll || event.deltaY < 0))
		scroll += event.deltaY;

	const	dist_between = -110;
	const	speed = 0.1;
	const	rotation_amount = 0.1;
	const	movex_amount = 10;

	var set = $('.pages');
	var length = set.length;
	set.each(function( index ) {
		let pos = scroll * speed + index * dist_between;
		if (pos > 1)
			pos = pos * pos * speed;

		let movez = String(pos * 0.75) + "px";

		let movex = 0;
		let movey = 0;
		let alpha = 1;
		let angle = 0;
		if (pos < 1)
			alpha = String(1 - (-pos * 0.009));
		if (pos > 1)
		{
			if (index === (length - 1)) {
				max_scroll = scroll;
				return ;
			}
			if (index % 2)
			{
				movex = String(pos * movex_amount) + "px";
				angle = String(-pos * rotation_amount) + "deg";
			}
			else
			{
				movex = String(-pos * movex_amount) + "px";
				angle = String(pos * rotation_amount) + "deg";
			}
			alpha = String(1 - (pos * 0.02));
		}
		let transforms = "";
		transforms += "perspective(200px) ";
		transforms += "scale3d(1,1,1) ";
		transforms += "translate3d(" + movex + "," + movey + "," + movez + ")";
		transforms += "rotateY(" + angle +") ";
		$(this).css("opacity", alpha);
		$(this).css("transform", transforms);
		$(this).css("z-index", String(5-index));
	});
}
