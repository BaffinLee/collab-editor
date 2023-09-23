import { getDataSource } from './datasource';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const isDev = env.DEV === 'true';
    const sqlite3 = {
      Database: function (fileName: string, mode?: number, callback?: (err: null | Error) => void) {
        Promise.resolve().then(() => callback?.(null));
        return {
          run(
            sql: string,
            params?: (string | number)[],
            callback?: (this: { lastID?: number, changes?: number }, err: null | Error) => void,
          ) {
            if (typeof params === 'function') {
              callback = params;
              params = [];
            } else if (typeof params === 'undefined') {
              params = [];
            }
            console.log('run', sql, params);
            env.CollaEditorDB.prepare(sql).bind(params || []).run().then(res => {
              console.log('run ok');
              callback?.call({
                lastID: 0,
                changes: 0,
              }, res.error || null);
            }).catch(err => {
              console.log('run err');
              callback?.call({
                lastID: 0,
                changes: 0,
              }, err);
            });
            return this;
          },
          all<T extends {}>(
            sql: string,
            params?: (string | number)[],
            callback?: (err: null | Error, rows: T[]) => void,
          ) {
            if (typeof params === 'function') {
              callback = params;
              params = [];
            } else if (typeof params === 'undefined') {
              params = [];
            }
            console.log('all', sql, params);
            env.CollaEditorDB.prepare(sql).bind(params || []).all<T>().then(res => {
              console.log('all ok');
              callback?.call({
                lastID: 0,
                changes: 0,
              }, res.error || null, res.results);
            }).catch(err => {
              console.log('all err');
              callback?.call({
                lastID: 0,
                changes: 0,
              }, err, []);
            });
            return this;
          },
          close(callback?: (err: null | Error) => void) {
            callback?.(null);
          },
        };
      },
      OPEN_URI: 0x40,
    };
    await getDataSource({
      logging: isDev,
      flags: 0x40,
      driver: {
        ...sqlite3,
        verbose: () => sqlite3,
      },
    });

		return new Response('ok');
	},
};
