$.getJSON('files', function (files) {
	$.each(files, function(index,file){		
		$('#files').append('<a class="link" title="Click to download file" href="downloads/' + file + '" target="_blank">' + file + '</a><br/>')
	});    
});