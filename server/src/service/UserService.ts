import UserEntity from "../entity/UserEntity";
import { getRandomName } from "../utils/name";

export default class UserService {
  static async getOrCreate(id: number) {
    let user = await UserEntity.findOneBy({ id });
    if (!user) {
      user = new UserEntity();
      user.name = getRandomName();
      user.avatar = `https://robohash.org/${user.name.replace(/[^a-z0-9]/gi, '')}`;
      await user.save();
    }
    return user;
  }

  static generateMemberId() {
    const min = Math.floor(Number.MAX_SAFE_INTEGER / 2);
    const max = Number.MAX_SAFE_INTEGER;
    return min + Math.floor((max - min) * Math.random());
  }
}
