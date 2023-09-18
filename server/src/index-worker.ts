import 'reflect-metadata';
import { createConnection } from 'typeorm';
import routes from './routes';
import ormConfig from '../ormconfig.json';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const isDev = env.DEV === 'true';
    const sqlite3 = {
      Database: (fileName: string, mode?: number, callback?: (err: null | Error) => {}) => {
        
      },
    };

    await createConnection({
      ...ormConfig,
      type: 'sqlite',
      synchronize: isDev,
      driver: {
        ...sqlite3,
        verbose: () => sqlite3,
      },
    });

		const url = new URL(request.url);

		return new Response(null, { status: 404 });
	},
};
