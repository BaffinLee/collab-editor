import { Context } from 'koa';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

export default class HomeController {
  static async showHomePage(ctx: Context) {
    const file = path.resolve(__dirname, '../../public/index.html');
    if (await promisify(fs.exists)(file)) {
      const content = await promisify(fs.readFile)(file, 'utf-8');
      ctx.headers['content-type'] = 'text/html';
      ctx.body = content;
      return;
    }
    ctx.status = 500;
    ctx.body = 'default page public/index.html not found.';
  }
}
