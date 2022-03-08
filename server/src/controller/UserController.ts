import { Context } from 'koa';
import UserService from '../service/UserService';

export default class UserController {
  static async get(ctx: Context) {
    const id = Number(ctx.cookies.get('user_id')) || 0;
    const user = await UserService.getOrCreate(id);
    if (user.id !== id) {
      ctx.cookies.set('user_id', `${user.id}`, {
        maxAge: 3600 * 24 * 365,
      });
    }
    ctx.body = {
      ...user,
      memberId: UserService.generateMemberId(),
    };
  }
}
