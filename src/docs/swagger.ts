// بديل SwaggerModule/@ApiOperation: OpenAPI بسيط بيتعرض عن طريق swagger-ui-express على /api/docs
// (في Nest كان بيتولد أوتوماتيك من الـ decorators، هنا لازم تحدّثه بإيدك لما تضيف endpoint)
type Json = Record<string, unknown>;

const bearer = [{ bearerAuth: [] }];
const str: Json = { type: 'string' };
const obj = (properties: Record<string, Json>, required: string[] = []): Json => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
});

const jsonBody = (schema: Json) => ({ required: true, content: { 'application/json': { schema } } });
const formBody = (schema: Json) => ({ required: true, content: { 'multipart/form-data': { schema } } });
const query = (name: string, description: string, schema: Json = str) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
});
const pathParam = (name: string) => ({ name, in: 'path', required: true, schema: str });

const op = (tag: string, summary: string, extra: Json = {}, auth = true): Json => ({
  tags: [tag],
  summary,
  ...(auth ? { security: bearer } : {}),
  responses: {
    '200': { description: 'OK' },
    '201': { description: 'Created' },
    '400': { description: 'Bad Request' },
    ...(auth ? { '401': { description: 'Unauthorized' } } : {}),
  },
  ...extra,
});

const email: Json = { type: 'string', format: 'email' };
const password: Json = { type: 'string', minLength: 8, maxLength: 72 };
const objectId: Json = { type: 'string', example: '64f1c0a2b3c4d5e6f7a8b9c0' };

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Domino Tournament & Gaming Platform',
    description: 'REST API for players, matches, stats and seasons',
    version: '1.0',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/': { get: op('app', 'Service banner', {}, false) },
    '/health': { get: op('app', 'Health check', {}, false) },

    // ---------- auth ----------
    '/auth/register': {
      post: op(
        'auth',
        'Create player account & optionally upload avatar to Cloudinary',
        {
          requestBody: formBody(
            obj(
              {
                name: str,
                nickname: str,
                email,
                password,
                avatar: { type: 'string', format: 'binary' },
              },
              ['name', 'nickname', 'email', 'password'],
            ),
          ),
        },
        false,
      ),
    },
    '/auth/verify-otp': {
      post: op(
        'auth',
        'Confirm email using the OTP token, send newPassword if provided',
        { requestBody: jsonBody(obj({ email, otp: { type: 'string', minLength: 6, maxLength: 6 }, newPassword: password }, ['email', 'otp'])) },
        false,
      ),
    },
    '/auth/resend-otp': {
      post: op(
        'auth',
        'Resend the email verification OTP, or send OTP to reset password',
        { requestBody: jsonBody(obj({ email }, ['email'])) },
        false,
      ),
    },
    '/auth/login': {
      post: op(
        'auth',
        'Authenticate player & return access token (refresh token in cookie)',
        { requestBody: jsonBody(obj({ email, password }, ['email', 'password'])) },
        false,
      ),
    },
    '/auth/change-password': {
      patch: op('auth', 'Change player password', {
        requestBody: jsonBody(obj({ oldPassword: str, newPassword: password }, ['oldPassword', 'newPassword'])),
      }),
    },
    '/auth/refresh': {
      post: op('auth', 'Issue a new access token (uses the refreshToken cookie)', {}, false),
    },
    '/auth/logout': { post: op('auth', 'Revoke the active refresh token') },
    '/auth/reset-password': {
      post: op('auth', 'Reset player password (Admins only)', {
        requestBody: jsonBody(obj({ email }, ['email'])),
      }),
    },
    '/auth/give-admin-role': { post: op('auth', 'Give player admin role (Admins only)') },

    // ---------- players ----------
    '/players/profile': { get: op('players', "Fetch the current authenticated player's profile") },
    '/players': {
      get: op('players', 'Season leaderboard', {
        parameters: [
          query('page', 'Page number', { type: 'integer', minimum: 1, default: 1 }),
          query('limit', 'Page size', { type: 'integer', minimum: 1, maximum: 100, default: 10 }),
        ],
      }),
    },
    '/players/update-avatar': {
      patch: op('players', 'Update profile picture (replaces the Cloudinary asset)', {
        requestBody: formBody(obj({ avatar: { type: 'string', format: 'binary' } }, ['avatar'])),
      }),
    },
    '/players/change-name': {
      patch: op('players', 'Change player name', {
        requestBody: jsonBody(obj({ newName: str }, ['newName'])),
      }),
    },
    '/players/change-nickname': {
      patch: op('players', 'Change player nickname', {
        requestBody: jsonBody(obj({ newNickname: str }, ['newNickname'])),
      }),
    },
    '/players/{playerId}': {
      get: op('players', 'Fetch a player by ID', { parameters: [pathParam('playerId')] }),
    },
    '/players/{playerId}/stats': {
      get: op('players', "Fetch a player's stats by ID", {
        parameters: [pathParam('playerId'), query('seasonId', 'Season in YYYY-MM format (default: current)')],
      }),
    },

    // ---------- matches ----------
    '/matches': {
      post: op('matches', 'Record a new domino match (Admins only)', {
        requestBody: jsonBody(
          obj(
            {
              matchType: {
                type: 'string',
                enum: ['DOMINO_INDIVIDUAL', 'DOMINO_PARTNERSHIP', 'DOMINO_TRIO', 'DOMINO_FOUR'],
              },
              winningTeam: { type: 'array', items: objectId, description: 'Player IDs on the winning side' },
              losingTeam: { type: 'array', items: objectId, description: 'Player IDs on the losing side' },
              winningPoints: { type: 'number', minimum: 0 },
              losingPoints: { type: 'number', minimum: 0 },
            },
            ['matchType', 'winningTeam', 'losingTeam', 'winningPoints', 'losingPoints'],
          ),
        ),
      }),
      get: op('matches', 'Get match history', {
        parameters: [
          query('page', 'Page number', { type: 'integer', minimum: 1, default: 1 }),
          query('limit', 'Page size', { type: 'integer', minimum: 1, maximum: 100, default: 10 }),
          query('playerId', 'Filter by player'),
          query('playerStatus', 'winner | loser | any', { type: 'string', enum: ['winner', 'loser', 'any'] }),
        ],
      }),
    },
    '/matches/season-summary/{seasonId}': {
      get: op('matches', 'Get season summary', { parameters: [pathParam('seasonId')] }),
    },
  },
};
