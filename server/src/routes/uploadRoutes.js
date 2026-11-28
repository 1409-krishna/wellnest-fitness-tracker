const express = require('express');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadAvatar,
  removeAvatar,
  uploadActivityImage,
} = require('../controllers/uploadController');

const router = express.Router();

router.use(auth);

router.post('/avatar', upload.single('image'), uploadAvatar);
router.delete('/avatar', removeAvatar);
router.post('/activity-image', upload.single('image'), uploadActivityImage);

module.exports = router;
