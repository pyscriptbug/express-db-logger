import { Pool, PoolClient, PoolConfig } from 'pg';

export class PgConnection {
  #pool: Pool;
  #connection?: PoolClient;

  constructor(config: PoolConfig) {
    this.#pool = new Pool(config);
    this.#verifyConnection();
  }

  async #verifyConnection() {
    this.#openConnection();
    this.#connection?.query("SELECT to_regclass('public.entdatalog')");
    this.#closeConnection();
  }

  async #openConnection() {
    if (!this.#connection) this.#connection = await this.#pool.connect();
  }

  async #closeConnection(err?: boolean | Error) {
    if (this.#connection) {
      this.#connection.release(err);
      this.#connection = undefined;
    }
  }
}
