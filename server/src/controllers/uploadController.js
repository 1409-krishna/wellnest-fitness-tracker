const User = require('../models/User');
const { uploadBuffer, deleteAsset } = require('../config/cloudinary');

// POST /api/upload/avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file to upload.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Securely delete previous avatar from Cloudinary if it exists
    if (user.avatarPublicId) {
      await deleteAsset(user.avatarPublicId);
    }

    // Upload new image buffer
    const uploadResult = await uploadBuffer(req.file.buffer, 'wellnest/avatars', {
      mimeType: req.file.mimetype,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    user.avatar = uploadResult.url;
    user.avatarPublicId = uploadResult.publicId;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture updated successfully.',
      avatar: user.avatar,
      provider: uploadResult.provider,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/upload/avatar
exports.removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.avatarPublicId) {
      await deleteAsset(user.avatarPublicId);
    }

    user.avatar = '';
    user.avatarPublicId = '';
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture removed.',
      avatar: '',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/upload/activity-image
exports.uploadActivityImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an activity image to upload.' });
    }

    const uploadResult = await uploadBuffer(req.file.buffer, 'wellnest/activities', {
      mimeType: req.file.mimetype,
      transformation: [
        { width: 800, height: 500, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    res.json({
      success: true,
      message: 'Activity image uploaded successfully.',
      imageUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      provider: uploadResult.provider,
    });
  } catch (err) {
    next(err);
  }
};
