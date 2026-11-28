const cloudinary = require('cloudinary').v2;

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[Cloudinary] Cloudinary configured with live credentials.');
} else {
  console.log('[Cloudinary] Missing credentials. Operating in development data-URI fallback mode.');
}

/**
 * Uploads a file buffer to Cloudinary (or falls back to a data URI if unconfigured)
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Target folder in Cloudinary
 * @param {object} options - Extra transformation options
 * @returns {Promise<{ url: string, publicId: string, provider: string }>}
 */
async function uploadBuffer(buffer, folder = 'wellnest', options = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid file buffer is required for upload');
  }

  if (isConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          ...options,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            provider: 'cloudinary',
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Graceful fallback when credentials are not configured in dev
  const mimeType = options.mimeType || 'image/jpeg';
  const base64Data = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const mockPublicId = `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    url: dataUri,
    publicId: mockPublicId,
    provider: 'fallback',
  };
}

/**
 * Deletes an asset by public ID from Cloudinary
 * @param {string} publicId
 */
async function deleteAsset(publicId) {
  if (!publicId || publicId.startsWith('fallback_')) {
    return { result: 'ok', provider: 'fallback' };
  }

  if (isConfigured) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (err) {
      console.error(`[Cloudinary] Failed to delete asset ${publicId}:`, err.message);
      return { result: 'error', error: err.message };
    }
  }

  return { result: 'ok', provider: 'fallback' };
}

module.exports = {
  cloudinary,
  isConfigured,
  uploadBuffer,
  deleteAsset,
};
