import multer from 'multer';
import { HttpError } from '../errors/http-error';

// بديل MulterModule.register({ storage: memoryStorage() }) + FileInterceptor('avatar')
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new HttpError(400, 'Only image files are allowed'));
    }
    cb(null, true);
  },
}).single('avatar');
