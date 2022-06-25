import { Pool, PoolClient, PoolConfig } from 'pg';
import { LogRequest } from '../types/log-request';
import { parseJwt } from '../utils/jwt';

export class PgConnection {
  #pool: Pool;
  #connection?: PoolClient;

  constructor(config: PoolConfig) {
    this.#pool = new Pool(config);
    this.#verifyConnection();
  }

  /** Verifies and creates the required tables if required */
  async #verifyConnection() {
    this.#connection = await this.#pool.connect();

    try {
      const { rows } = await this.#connection.query("SELECT to_regclass('public._request_datalog')");
      const toRegclass = rows[0].to_regclass;

      if (!toRegclass) {
        await this.#connection.query(`
        CREATE TABLE IF NOT EXISTS _request_datalog (
            user_id NUMERIC NOT NULL,
            internal_user_id NUMERIC,
            request_url JSONB,
            request_data JSONB,F
            response_data JSONB,
            execution_time NUMERIC
            timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )`);
      }
    } catch (e) {
      console.error(e);
    }

    this.#closeConnection();
  }

  #closeConnection() {
    this.#connection?.release();
    this.#connection = undefined;
  }

  #buildLogQuery(data: LogRequest) {
    const tokenData = parseJwt(data.token);

    return `
        INSERT INTO _request_datalog (
        user_id,
        internal_user_id,
        request_url,
        request_data,
        response_data,
        execution_time
        ) VALUES (
        ${tokenData.userId},
        ${tokenData.internalUserId},
        '${data.requestUrl}',
        '${data.requestData}',
        '${data.responseData}',
        ${data.executionTime}
        )`;
  }

  public async logRequest(data: LogRequest) {
    try {
      await this.#pool.query(this.#buildLogQuery(data));
    } catch (e) {
      console.error(e);
    }
  }
}
