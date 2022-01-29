export function	handleVertical() {
	var img = document.getElementsByTagName("img");
	for (var i = 0; i < img.length; i++) {
		img[i].style.height = "100%";
		img[i].style.width = "auto";
	}
	$('.image_column').each(function() {
		$(this).css("grid-column", "none");
		$(this).css("grid-row", "1 / 2");
	});
	$('.text-column').each(function() {
		$(this).css("grid-column", "none");
		$(this).css("grid-row", "2 / 2");
	});
	$('.pages').each(function() {
		$(this).css("grid-template-columns", "none");
		$(this).css("grid-template-rows", "35% 65%");
		$(this).css("font-size", "1.4vh");
	});
	$('.no_col').each(function() {
		$(this).css("width", "50%");
		$(this).css("left", "25%");
	});
}
