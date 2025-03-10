import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleGetRequest } from '../handlers/getHandler';
import { handlePostRequest } from '../handlers/postHandler';
import { InternalError } from '../common/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET' || req.method === 'OPTIONS') {
      return await handleGetRequest(req, res);
    } else if (req.method === 'POST') {
      return await handlePostRequest(req, res);
    } else {
      throw new Error('Unsupported method' + req.method);
    }
  } catch (error) {
    console.error(error);
    if (error instanceof InternalError) {
      res.status(error.errorCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
