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

partialImageCanvas.addEventListener('click', function(e) {
    var pos = findPos(this);
    var x = e.pageX - pos.x;
    var y = e.pageY - pos.y;
    getPixelInformation(x, y);
    console.log('clicked ', x, y)

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


var getPixelInformation = function(x, y) {
    var request = new XMLHttpRequest();
    request.open('GET', '/pixel?x=' + x + '&y=' + y, true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var response = JSON.parse(request.responseText);
            if (response.available) {
                revealPixel(x, y);
            } else {
                console.log('already taken by ' + response.tweetData.username);
            }
        } else {
            // We reached our target server, but it returned an error

        }
    };

    request.onerror = function() {
        // There was a connection error of some sort
    };

    request.send();
};


var revealPixel = function(x, y) {
    var tweetData = {
        x: x,
        y: y,
        username: 'nick ' + Date.now(),
        tweetContent: 'hello world!',
        tweetId: Date.now()
    };
    var payload = JSON.stringify(tweetData);
    var request = new XMLHttpRequest();
    request.open('POST', '/pixel', true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var resp = request.responseText;
            console.log(resp);
        } else {
            // We reached our target server, but it returned an error

        }
    };
    request.send(payload);
};