import { Context } from 'koa';
import dayjs from 'dayjs';
import CodeService from '../service/CodeService';
import RoomService from '../service/RoomService';
import RoomServiceWorker from '../service/RoomServiceWorker';
import { convertChangesets } from '../../../common/utils/type';
import CodeEntity from '../entity/CodeEntity';
import ChangesetService from '../service/ChangesetService';
import Changeset from '../../../common/model/Changeset';
import { transformChangesets, TransformType } from '../../../common/transform/transform';
import Model, { ApplyType } from '../../../common/model/Model';
import { getLock, releaseLock } from '../utils/lock';
import { SocketMessageType } from '../../../common/type/message';
import { getChangesetOperations } from '../../../common/utils';
import ChangesetEntity from '../entity/ChangesetEntity';
import { getDataSource } from '../datasource';

export default class CodeController {
  static async get(ctx: Context) {
    const codeId = ctx.params.codeId || dayjs().format('YYYYMMDD');
    ctx.body = await CodeService.getOrCreate(codeId);
  }

  static async getMembers(ctx: Context) {
    const service = ctx.env?.WORKER ? RoomServiceWorker : RoomService;
    const codeId = ctx.params.codeId || '';
    ctx.body = await service.getRoomInfo(codeId, ctx);
  }

  static async uploadChangeset(ctx: Context) {
    const userId = Number(ctx.cookies.get('user_id') || ctx.query.userId);
    const codeId = ctx.params.codeId;
    let code = await CodeEntity.findOneBy({ codeId });
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
      code = await CodeEntity.findOneBy({ codeId }) as CodeEntity;

      const codeVersion = code.version;
      let beforeChangesets: Changeset[] = [];
      if (baseVersion < codeVersion) {
        beforeChangesets = await ChangesetService.getByRange(codeId, baseVersion, codeVersion);
        [changesets, beforeChangesets] = transformChangesets(changesets, beforeChangesets, TransformType.Left);
      }

      const model = new Model(code.content);
      model.applyChangesets(changesets, ApplyType.Server);

      const operations = getChangesetOperations(changesets);

      await (await getDataSource()).transaction(async transactionalEntityManager => {
        await CodeService.save(
          model.getContent(),
          codeVersion + 1,
          code!,
          transactionalEntityManager,
        );

        const changeset = new ChangesetEntity();
        changeset.codeId = codeId;
        changeset.operations = JSON.stringify(operations);
        changeset.baseVersion = codeVersion;
        changeset.userId = userId;
        changeset.memberId = memberId;
        await transactionalEntityManager.save(changeset);
      });

      RoomService.broadcastMessages([operations.length > 100 ? {
        type: SocketMessageType.Heartbeat,
        data: {
          version: codeVersion + 1,
        },
      } : {
        type: SocketMessageType.UserChange,
        data: {
          changesets: [new Changeset(
            operations,
            userId,
            memberId,
            codeVersion,
          )],
        },
      }], codeId, memberId);

      releaseLock(codeId);

      ctx.body = {
        version: codeVersion + 1,
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

    const changesets = await ChangesetService.getByRange(codeId, baseVersion, targetVersion);
    ctx.body = changesets;
  }

  static async updateMeta(ctx: Context) {
    let { title, language, memberId } = ctx.request.body as {
      title?: string,
      language?: string,
      memberId: number,
    };
    title = title?.trim();
    language = language?.trim();
    memberId = Number(memberId);
    const codeId = ctx.params.codeId;
    if ((title === undefined && language === undefined) || !memberId || !codeId) {
      ctx.status = 400;
      return;
    }

    const code = await CodeEntity.findOneBy({ codeId });
    if (!code) {
      ctx.status = 400;
      return;
    }

    code.title = title !== undefined ? title : code.title;
    code.language = language !== undefined ? language : code.language;
    code.metaVersion = code.metaVersion + 1;
    await code.save();

    RoomService.broadcastMessages([{
      type: SocketMessageType.MetaChange,
      data: {
        title,
        language,
        metaVersion: code.metaVersion,
      },
    }], codeId, memberId);

    ctx.body = {};
  }
}
