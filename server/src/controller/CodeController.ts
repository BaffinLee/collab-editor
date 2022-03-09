import { Context } from 'koa';
import dayjs from 'dayjs';
import CodeService from '../service/CodeService';
import RoomService from '../service/RoomService';
import { convertChangesets } from '../../../common/utils/type';
import CodeEntity from '../entity/CodeEntity';
import ChangesetService from '../service/ChangesetService';
import Changeset from '../../../common/model/Changeset';
import { transformChangesets, TransformType } from '../../../common/transform/transform';
import Model, { ApplyType } from '../../../common/model/Model';
import Operation from '../../../common/operation/Operation';
import { getLock, releaseLock } from '../utils/lock';
import { SocketMessageType } from '../../../common/type/message';
import { getChangesetOperations } from '../../../common/utils';

export default class CodeController {
  static async get(ctx: Context) {
    const codeId = ctx.params.codeId || dayjs().format('YYYYMMDD');
    ctx.body = await CodeService.getOrCreate(codeId);
  }

  static async getMembers(ctx: Context) {
    const codeId = ctx.params.codeId || '';
    const members = await RoomService.getRoomMembers(codeId);
    ctx.body = members;
  }

  static async uploadChangeset(ctx: Context) {
    const userId = Number(ctx.cookies.get('user_id'));
    const codeId = ctx.params.codeId;
    let code = await CodeEntity.findOne({ codeId });
    if (!userId || !codeId || !code) {
      ctx.status = 403;
      return;
    }

    let { baseVersion, changesets, memberId } = ctx.request.body as {
      changesets: Changeset[];
      baseVersion: number;
      memberId: number;
    };
    baseVersion = Number(baseVersion);
    memberId = Number(memberId);

    if (!(baseVersion >= 0) || !memberId || !changesets?.length || baseVersion > code.version) {
      ctx.status = 403;
      return;
    }
    
    changesets = convertChangesets(changesets);

    await getLock(codeId);

    try {
      code = await CodeEntity.findOne({ codeId }) as CodeEntity;

      let beforeChangesets: Changeset[] = [];
      if (baseVersion < code.version) {
        const list = await ChangesetService.getByRange(codeId, baseVersion, code.version);
        beforeChangesets = convertChangesets(list.map(item => {
          return {
            ...item,
            operations: item.getOperations(),
          };
        }));
        
        [changesets, beforeChangesets] = transformChangesets(changesets, beforeChangesets, TransformType.Left);
      }

      const model = new Model(code.content);
      model.applyChangesets(changesets, ApplyType.Server);

      const operations = getChangesetOperations(changesets);
      await CodeService.update(model.getContent(), code.version + 1, codeId);
      await ChangesetService.save(
        codeId,
        JSON.stringify(operations),
        code.version,
        userId,
        memberId,
      );

      RoomService.broadcastMessages([operations.length > 100 ? {
        type: SocketMessageType.Heartbeat,
        data: {
          version: code.version + 1,
        },
      } : {
        type: SocketMessageType.UserChange,
        data: {
          changesets: [new Changeset(
            operations,
            userId,
            memberId,
            code.version,
          )],
        },
      }], codeId, memberId);

      releaseLock(codeId);

      ctx.body = {
        version: code.version + 1,
        changesets: beforeChangesets,
      };
    } catch (error) {
      console.error(error);
      releaseLock(codeId);
      ctx.status = 500;
    }
  }

  static async getChangeset(ctx: Context) {
    const baseVersion = Number(ctx.query.baseVersion);
    const targetVersion = Number(ctx.query.targetVersion);
    const codeId = ctx.params.codeId;
    if (!(targetVersion > baseVersion) || !codeId) {
      ctx.status = 400;
      return;
    }

    const list = await ChangesetService.getByRange(codeId, baseVersion, targetVersion);
    const changesets = convertChangesets(list.map(item => ({ ...item, operations: item.getOperations() })));
    ctx.body = changesets;
  }
}
