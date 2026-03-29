const Jimp = require('jimp');

async function test() {
  try {
    console.log("Jimp:", typeof Jimp);
    console.log("Jimp.read:", typeof Jimp.read);
    
    // Creating a transparent image instead of reading to just test the API shape
    new Jimp(256, 256, 0x00000000, (err, image) => {
      if (err) throw err;
      console.log("Created image:", typeof image);
      console.log("image.resize:", typeof image.resize);
      console.log("image.grayscale:", typeof image.grayscale);
      console.log("image.contrast:", typeof image.contrast);
      console.log("image.normalize:", typeof image.normalize);
      console.log("image.writeAsync:", typeof image.writeAsync);
    });
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
