import { Context } from 'koa';
import UserService from '../service/UserService';

export default class UserController {
  static async get(ctx: Context) {
    const id = Number(ctx.cookies.get('user_id')) || 0;
    const user = await UserService.getOrCreate(id);
    if (user.id !== id) {
      ctx.cookies.set('user_id', `${user.id}`, {
        path: '/',
        maxAge: 3600 * 1000 * 24 * 365,
        ...(ctx.request.protocol === 'https' ? {
          sameSite: 'none',
          secure: true,
        } : {}),
      });
    }
    ctx.body = {
      ...user,
      memberId: UserService.generateMemberId(),
    };
  }
}
