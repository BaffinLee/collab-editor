import UserEntity from "../entity/UserEntity";
import { faker } from "@faker-js/faker";
import md5 from "blueimp-md5"

export default class UserService {
  static async getOrCreate(id: number) {
    let user = await UserEntity.findOneBy({ id });
    if (!user) {
      user = new UserEntity();
      user.name = faker.name.findName();
      user.avatar = `https://robohash.org/${md5(user.name)}`;
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
