import { getDataSource } from './datasource';
import { Router, Context } from 'cloudworker-router';
import routes from './routes';

const getSqlite3Driver = (env: Env) => ({
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
        const isInsertQuery = sql.startsWith("INSERT ");
        const isDeleteQuery = sql.startsWith("DELETE ");
        const isUpdateQuery = sql.startsWith("UPDATE ");
        if (isInsertQuery || isDeleteQuery || isUpdateQuery) {
          sql += ' RETURNING *';
        }
        console.log('run', sql, params);
        env.CollaEditorDB.prepare(sql).bind(...params).run<{ id: number }>().then(res => {
          callback?.call({
            lastID: res.results[0]?.id || 0,
            changes: res.results.length,
          }, res.error || null);
        }).catch(err => {
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
        callback?: (this: { lastID?: number, changes?: number }, err: null | Error, rows: T[]) => void,
      ) {
        if (typeof params === 'function') {
          callback = params;
          params = [];
        } else if (typeof params === 'undefined') {
          params = [];
        }
        console.log('all', sql, params);
        const isTransactionStart = sql.startsWith("BEGIN TRANSACTION");
        const isTransactionDrop = sql.startsWith("ROLLBACK");
        const isTransactionEnd = sql.startsWith("COMMIT");
        if (isTransactionStart || isTransactionEnd || isTransactionDrop) {
          callback?.call({
            lastID: 0,
            changes: 0
          }, null, []);
          return this;
        }
        env.CollaEditorDB.prepare(sql).bind(...params).all<T>().then(res => {
          callback?.call({
            lastID: 0,
            changes: 0,
          }, res.error || null, res.results);
        }).catch(err => {
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
});

const getKoaContext = async (ctx: Context<Env>, request: Request) => {
  interface CookieOption {
    maxAge?: number | undefined;
    expires?: Date | undefined;
    path?: string | undefined;
    domain?: string | undefined;
    secure?: boolean | undefined;
    httpOnly?: boolean | undefined;
    sameSite?: 'strict' | 'lax' | 'none' | boolean | undefined;
  }
  const reqCookies = (request.headers.get('cookie') || '')
    .split(';')
    .map(item => item.trim())
    .filter(item => !!item)
    .map(item => item.split('='))
    .reduce((map, item) => {
      if (item[0]) map[item[0]] = item[1] || '';
      return map;
    }, {} as { [key: string]: string });
  let reqBody = {};
  try {
    reqBody = await request.json()
  } catch (err) {
    // do nothing
  }
  const context = {
    body: '',
    status: 200,
    request: {
      ...request,
      body: reqBody,
    },
    query: ctx.query,
    resCookies: {} as { [key: string]: CookieOption & { value: string } },
    params: ctx.params,
    headers: {} as { [key: string]: string },
    cookies: {
      get(key: string) {
        return reqCookies[key];
      },
      set(key: string, value: string, options?: CookieOption) {
        context.resCookies[key] = {
          ...options,
          value,
        };
      },
    },
  };
  return context;
};

const getResByCtx = async (context: Awaited<ReturnType<typeof getKoaContext>>) => {
  const header = new Headers(context.headers);
  Object.keys(context.resCookies).forEach(key => {
    const opt = context.resCookies[key];
    let arr = [`${key}=${opt.value}`];
    if (opt.maxAge) opt.expires = new Date(Date.now() + opt.maxAge);
    if (opt.path) arr.push("path=" + opt.path);
    if (opt.expires) arr.push("expires=" + opt.expires.toUTCString());
    if (opt.domain) arr.push("domain=" + opt.domain);
    if (opt.sameSite) arr.push("samesite=" + (opt.sameSite === true ? 'strict' : opt.sameSite.toLowerCase()));
    if (opt.secure) arr.push("secure");
    if (opt.httpOnly) arr.push("httponly");
    header.append('Set-Cookie', arr.join('; '));
  });
  return new Response(typeof context.body === 'string' ? context.body : JSON.stringify(context.body), {
    headers: header,
    status: context.status,
  });
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const isDev = env.DEV === 'true';
    const sqlite3 = getSqlite3Driver(env);
    await getDataSource({
      logging: isDev,
      synchronize: isDev,
      flags: sqlite3.OPEN_URI,
      driver: {
        ...sqlite3,
        verbose: () => sqlite3,
      },
    });

    const router = new Router<Env>();
    let context: Awaited<ReturnType<typeof getKoaContext>>;
    router.use(async (ctx, next) => {
      const origin = ctx.request.headers.get('Origin')
        || ctx.request.headers.get('Referer')
        || ctx.request.url;
      const url = new URL(origin);
      context = await getKoaContext(ctx, request);
      context.headers['Access-Control-Allow-Origin'] = url.origin;
      context.headers['Access-Control-Max-Age'] = '86400';
      context.headers['Access-Control-Allow-Headers'] = 'Content-Type';
      context.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
      if (ctx.request.method === 'OPTIONS') {
        return getResByCtx(context);
      } else {
        return next();
      }
    });
    routes.forEach(route => {
      router[route.method as 'all'](route.path, async (ctx) => {
        context.params = ctx.params;
        await route.handler(context as any);
        return getResByCtx(context);
      });
    });

    return router.handle(request, env, ctx);
	},
};
