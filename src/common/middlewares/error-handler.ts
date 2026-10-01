import { STATUS_CODES } from 'http';
import { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../errors/http-error';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Cannot ${req.method} ${req.originalUrl}`));
};

// بديل HttpExceptionFilter (لازم يتسجل آخر حاجة).
// حافظت على نفس شكل الرد القديم بالظبط:
//   4xx => { statusCode, message: { message, error, statusCode } }   (كان بيرجع exception.getResponse())
//   500 => { statusCode, message: 'Internal server error' }
// لو عايز شكل أبسط { statusCode, message, error } غيّر الـ return الأخير بس.
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = 500;
  let message: string | string[] = 'Internal server error';

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.responseMessage;
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.message;
  } else if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    // أخطاء express نفسها (JSON بايظ مثلاً)
    statusCode = err.status;
    message = err.message;
  }

  if (statusCode >= 500) {
    console.error(err);
    return res.status(statusCode).json({ statusCode, message });
  }

  return res.status(statusCode).json({
    statusCode,
    message: { message, error: STATUS_CODES[statusCode], statusCode },
  });
};
