# image revealer

## TweetFile Format

    for a 640x480 image = 307200 pixels
         
    307200 * (560 bytes in a tweet + 60 bytes in a username + 8 bytes in tweet id)
    =
    192,921,600 bytes
    = 193 megabytes total storage required

We don't need to load all the data when the page comes down because there is no way that a user will click every single tweet. We need a file that is addressable by pixel so that a user can view the associated tweet by intentionally clicking a specific pixel.

File format: 

Each 628 byte chunk contains

* 560 bytes of UTF-8 text for a tweet, padded with zeroes 
* 60 bytes of UTF-8 text for a username 
* 8 byte unsigned integer for a tweet id 

Addressable from top left pixel (0, 0) at index 0. Top right pixel (639, 0) at index 639.
Bottom left pixel at (0, 479) at index 306559. Bottom right pixel at (639, 479) at index 307199

Compression isn't really necessary yet. The file will be mostly padded with zeroes. The whole file should fit in memory so there should be fast random access to any pixel. 

TODO: benchmark this.


## Partial Image Generator

We read in the tweetfile and the jpeg image to produce a partially revealed image to send to clients. Every pixel that does not have a tweet associated with it appears blacked out. This image can be cached and updated every few minutes or whenever enough new pixels are revealed.

Once the image is downloaded to the client, more pixels can be revealed in real-time and rendered on top of the client's image. Can a jpeg be converted to an HTML5 canvas? That could be a nice way to reveal pixels as they come over the wire.







