import { NextFunction, Request, Response } from 'express';
import { PgConnection } from '../connections';
import { InitializeLogger } from '../types/initialize';

const ConnectionMapper = {
  postgres: PgConnection,
};

export const applyLoggerMiddleware = ({
  connectionType = 'postgres',
  connectionString = process.env.LOGGER_CONNECTION_STRING ?? '',
}: InitializeLogger) => {
  const connection = new ConnectionMapper[connectionType]({ connectionString });

  console.log(connection);

  return (req: Request, res: Response, next: NextFunction) => {
    const chunks: any[] = [];

    res.write = (chunk, ...args) => {
      chunks.push(chunk);
      if (!args) return res.write.apply(res, [chunk, args[0]]);
      return res.write.apply(res, [chunk, ...args] as any);
    };

    res.end = (chunk, ...args: any) => {
      if (chunk) chunks.push(chunk);

      const body = Buffer.concat(chunks).toString('utf8');
      console.log(req.path, body);
      return res.end.apply(res, [chunk, ...args] as any);
    };

    next();
  };
};
