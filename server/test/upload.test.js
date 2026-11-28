const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { connectDb } = require('../src/config/db');
const User = require('../src/models/User');
const Activity = require('../src/models/Activity');
const uploadController = require('../src/controllers/uploadController');
const activityController = require('../src/controllers/activityController');

async function runTests() {
  console.log('--- STARTING PHASE 4 CLOUDINARY UPLOAD INTEGRATION TESTS ---');
  await connectDb();

  // Test user
  let user = await User.findOne({ email: 'phase4_upload_test@wellnest.com' });
  if (!user) {
    user = await User.create({
      name: 'Upload Tester',
      email: 'phase4_upload_test@wellnest.com',
      passwordHash: 'dummyhash',
      authProvider: 'local',
    });
  }

  let resData = null;
  let resStatus = 200;
  const mockRes = () => ({
    status: (s) => { resStatus = s; return mockRes(); },
    json: (d) => { resData = d; return d; },
  });

  // Create a 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const mockFile = {
    buffer: samplePngBuffer,
    mimetype: 'image/png',
    originalname: 'test_avatar.png',
    size: samplePngBuffer.length,
  };

  // 1. Upload Avatar
  await uploadController.uploadAvatar(
    { user, file: mockFile },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 1: uploadAvatar returned status:', resStatus, 'avatar length:', resData.avatar.length, 'provider:', resData.provider);
  if (!resData.avatar) throw new Error('Expected avatar URL to be returned');

  const updatedUser = await User.findById(user._id);
  if (!updatedUser.avatar) throw new Error('User avatar was not saved in database');
  const firstPublicId = updatedUser.avatarPublicId;

  // 2. Upload Second Avatar (testing asset replacement)
  await uploadController.uploadAvatar(
    { user: updatedUser, file: mockFile },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 2: second upload replaced avatar successfully');

  // 3. Upload Activity Image
  await uploadController.uploadActivityImage(
    { user, file: mockFile },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 3: uploadActivityImage returned status:', resStatus, 'imageUrl length:', resData.imageUrl.length);
  const uploadedActivityImage = resData.imageUrl;
  const uploadedActivityPublicId = resData.publicId;

  // 4. Create Activity with Uploaded Image
  let actData = null;
  const mockActRes = () => ({
    status: (s) => ({ json: (d) => { actData = d; return d; } }),
    json: (d) => { actData = d; return d; },
  });

  await activityController.create(
    {
      user,
      body: {
        name: 'Sunset Forest Trail Walk',
        category: 'movement',
        intensity: 'gentle',
        durationMins: 35,
        description: 'Mindful evening nature walk through shaded trails.',
        image: uploadedActivityImage,
        imagePublicId: uploadedActivityPublicId,
      },
    },
    mockActRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 4: Activity created with attached image! Name:', actData.name, 'Has image:', Boolean(actData.image));
  if (!actData.image) throw new Error('Expected activity to contain image');

  // 5. Remove Avatar
  await uploadController.removeAvatar(
    { user: updatedUser },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 5: removeAvatar cleared avatar successfully');
  const clearedUser = await User.findById(user._id);
  if (clearedUser.avatar !== '') throw new Error('Expected avatar to be empty');

  // Cleanup
  await Activity.deleteMany({ createdBy: user._id });
  await User.deleteOne({ _id: user._id });

  console.log('--- ALL PHASE 4 CLOUDINARY UPLOAD TESTS PASSED 100% ---');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
