import { Pool, PoolClient, PoolConfig } from 'pg';
import { LogRequest } from '../types/log-request';
import { parseJwt } from '../utils/jwt';
import { sanitizeData } from '../utils/query';

const SCHEMA_NAME = 'datalogger';
const REQUEST_LOG_TABLE = '_request_datalog';

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
      await this.#connection.query(`
      DO $$
      BEGIN
          IF NOT EXISTS(
              SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = '${SCHEMA_NAME}'
            )
          THEN
            EXECUTE 'CREATE SCHEMA ${SCHEMA_NAME}';
          END IF;
      END
      $$;`);

      const { rows } = await this.#connection.query(`SELECT to_regclass('${SCHEMA_NAME}.${REQUEST_LOG_TABLE}')`);
      const toRegclass = rows[0].to_regclass;

      if (!toRegclass) {
        await this.#connection.query(`
        CREATE TABLE IF NOT EXISTS ${SCHEMA_NAME}.${REQUEST_LOG_TABLE} (
            request_url VARCHAR(255),
            token_data JSONB,
            request_data JSONB,
            response_data JSONB,
            timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
            execution_time NUMERIC
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
        INSERT INTO ${SCHEMA_NAME}.${REQUEST_LOG_TABLE} (
        request_url,
        token_data,
        request_data,
        response_data,
        execution_time
        ) VALUES (
        '${data.requestUrl}',
        '${sanitizeData(tokenData)}',
        '${sanitizeData(data.requestData)}',
        '${sanitizeData(data.responseData)}',
        ${data.executionTime}
        )`;
  }

  public async logRequest(data: LogRequest) {
    const query = this.#buildLogQuery(data);
    try {
      await this.#pool.query(query);
    } catch (e) {
      console.error(e);
    }
  }
}
