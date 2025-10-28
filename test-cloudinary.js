require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

cloudinary.api.ping()
  .then(result => {
    console.log('✓ Cloudinary connected successfully!');
    console.log(result);
  })
  .catch(error => {
    console.error('✗ Cloudinary connection failed:');
    console.error(error);
  });