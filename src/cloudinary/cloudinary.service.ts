import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { config } from '../config/configuration';
import { HttpError } from '../common/errors/http-error';

// بديل CloudinaryProvider: إعداد الـ SDK مرة واحدة
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export class CloudinaryService {
  // بيرفع الـ buffer من multer مباشرة لـ Cloudinary (من غير ملفات مؤقتة)
  uploadImage(file: Express.Multer.File, folder = 'domino-platform/avatars'): Promise<UploadApiResponse> {
    if (!file) {
      throw new HttpError(400, 'No file provided');
    }
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // بيتنادى لما اللاعب يغير صورته عشان الصورة القديمة ما تفضلش على Cloudinary
  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  }
}

export const cloudinaryService = new CloudinaryService();
