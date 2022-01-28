import { scroll } from "./input.js"

export let	maxScroll = 999999;

export function	scrollPages(event) {
	const	distBetween = -110;
	const	speed = 0.1;
	const	rotationAmount = 0.1;
	const	moveXAmount = 10;

	var set = $('.pages');
	var length = set.length;
	set.each(function( index ) {
		let pos = scroll * speed + index * distBetween;
		if (pos > 1)
			pos = pos * pos * speed;

		let movez = String(pos * 0.75) + "px";

		let moveX = 0;
		let moveY = 0;
		let alpha = 1;
		let angle = 0;
		if (pos < 1)
			alpha = String(1 - (-pos * 0.009));
		if (pos > 1)
		{
			if (index === (length - 1)) {
				maxScroll = scroll;
				return ;
			}
			if (index % 2)
			{
				moveX = String(pos * moveXAmount) + "px";
				angle = String(-pos * rotationAmount) + "deg";
			}
			else
			{
				moveX = String(-pos * moveXAmount) + "px";
				angle = String(pos * rotationAmount) + "deg";
			}
			alpha = String(1 - (pos * 0.02));
		}
		let transforms = "";
		transforms += "perspective(200px) ";
		transforms += "scale3d(1,1,1) ";
		transforms += "translate3d(" + moveX + "," + moveY + "," + movez + ")";
		transforms += "rotateY(" + angle +") ";
		$(this).css("opacity", alpha);
		$(this).css("transform", transforms);
		$(this).css("z-index", String(5 - index));
	});
}
