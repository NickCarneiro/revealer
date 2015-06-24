var IMAGE_WIDTH = 640;
var IMAGE_HEIGHT = 480;
var IMAGE_SRC = '/images/output.png';
var partialImageCanvas = document.getElementById('hidden-image-canvas');


var selectedPixelText = document.getElementById('selected-pixel');
var hiddenImageElement = document.getElementById('hidden-image');
// copy the partially revealed image to a canvas and hide the actual image so
// we can draw new pixels as they come through
var partialImage = new Image(IMAGE_WIDTH, IMAGE_HEIGHT);

partialImage.src = IMAGE_SRC; // should be loaded from cache because it was called from
var canvasContext = partialImageCanvas.getContext('2d');
partialImage.onload = function() {
    canvasContext.drawImage(partialImage,0,0);
    partialImageCanvas.style.display = 'block';
    hiddenImageElement.style.display = 'none';

};

partialImageCanvas.addEventListener('mousemove', function(e) {
    var pos = findPos(this);
    var x = e.pageX - pos.x;
    var y = e.pageY - pos.y;
    var rgbaString = pixelDataToRgbString(canvasContext.getImageData(x, y, 1, 1).data);
    selectedPixelText.innerHTML = 'Click to reveal pixel ' + x + ', ' + y + ' - ' + rgbaString;

});

partialImageCanvas.addEventListener('mouseout', function(e) {
    selectedPixelText.innerHTML = 'Mouse over the image...';

});


function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

var pixelDataToRgbString = function(pixelData) {
    return 'rgba(' + pixelData[0] + ', ' + pixelData[1] + ', ' + pixelData[2] + ')';
};