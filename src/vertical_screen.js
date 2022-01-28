export function	handleVertical() {
	var img = document.getElementsByTagName("img");
	for (var i = 0; i < img.length; i++) {
		img[i].style.height = "100%";
		img[i].style.width = "auto";
	}
	var set = $('.image_column');
	set.each(function( index ) {
		$(this).css("grid-column", "none");
		$(this).css("grid-row", "1 / 2");
	});
	var set = $('.text_column');
	set.each(function( index ) {
		$(this).css("grid-column", "none");
		$(this).css("grid-row", "2 / 2");
	});
	var set = $('.pages');
	set.each(function( index ) {
		$(this).css("grid-template-columns", "none");
		$(this).css("grid-template-rows", "50% 50%");
		$(this).css("font-size", "1.4vh");
	});
}
