import { NextFunction, Request, Response } from 'express';
import { PgConnection } from '../connections';
import { InitializeLogger } from '../types/initialize';

const ConnectionMapper = {
  postgres: PgConnection,
};

const DEFAULT_INITIALIZE_OPTIONS: InitializeLogger = {
  connectionType: 'postgres',
  connectionString: process.env.DATABASE_URL,
};

export const applyLoggerMiddleware = ({
  connectionType,
  connectionString,
}: InitializeLogger = DEFAULT_INITIALIZE_OPTIONS) => {
  const connection = new ConnectionMapper[connectionType]({ connectionString });

  return (req: Request, res: Response, next: NextFunction) => {
    const { write, end } = res;
    const {
      headers: { authorization },
      hostname,
    } = req;

    const token = authorization?.split(' ')[1] || '';
    const startTime = Date.now();

    const chunks: Buffer[] = [];

    res.write = (chunk, ...args) => {
      chunks.push(chunk);
      return write.apply(res, [chunk, ...args] as any);
    };

    res.end = (chunk, ...args: any) => {
      if (chunk) chunks.push(chunk);
      const responseBody = JSON.parse(Buffer.concat(chunks).toString('utf8'));

      connection.logRequest({
        token,
        requestData: req.body,
        responseData: responseBody,
        requestUrl: `${hostname}${req.url}`,
        executionTime: Date.now() - startTime,
      });

      return end.apply(res, [chunk, ...args] as any);
    };

    next();
  };
};
