// بديل HttpException (BadRequestException, NotFoundException, ...) بتاعت Nest
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly responseMessage: string | string[],
  ) {
    super(Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage);
    this.name = 'HttpError';
  }
}
