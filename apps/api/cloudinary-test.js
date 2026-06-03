const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: 'dkjd2fqog',
  api_key: '541687744924559',
  api_secret: '_Pi2Dk3hN8kD-hgJ95vVIgl9NB4'
});

async function run() {
  try {
    console.log('Uploading image...');
    
    // 2. Upload an image
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      { public_id: 'test_sample' }
    );
    
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);
    
    // 3. Get image details
    console.log('\n--- Image Details ---');
    console.log('Width:', uploadResult.width);
    console.log('Height:', uploadResult.height);
    console.log('Format:', uploadResult.format);
    console.log('File size (bytes):', uploadResult.bytes);
    
    // 4. Transform the image
    // f_auto: Automatically selects the best image format based on the requesting browser (e.g., WebP, AVIF)
    // q_auto: Automatically optimizes the image quality to balance size and visual fidelity
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });
    
    console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
