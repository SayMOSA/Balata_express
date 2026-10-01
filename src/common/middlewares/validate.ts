import { RequestHandler } from 'express';
import { ZodError, ZodIssue, ZodTypeAny } from 'zod';
import { HttpError } from '../errors/http-error';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

const formatIssue = (issue: ZodIssue): string[] => {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((k) => `property ${k} should not exist`); // = forbidNonWhitelisted
  }
  const path = issue.path.join('.');
  return [path ? `${path}: ${issue.message}` : issue.message];
};

// بديل ValidationPipe (whitelist + forbidNonWhitelisted + transform):
//   .strict()      => whitelist + forbidNonWhitelisted
//   z.coerce.*     => transform / تحويل الأنواع
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);

      // في Express 5 الـ req.query و req.params getters، فلازم defineProperty
      if (schemas.query) {
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
        });
      }
      if (schemas.params) {
        Object.defineProperty(req, 'params', {
          value: schemas.params.parse(req.params),
          writable: true,
          configurable: true,
        });
      }
    } catch (err) {
      if (err instanceof ZodError) {
        throw new HttpError(400, err.issues.flatMap(formatIssue));
      }
      throw err;
    }
    next();
  };
