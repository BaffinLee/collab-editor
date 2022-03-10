import CodeController from './controller/CodeController';
import UserController from './controller/UserController';
import HistoryController from './controller/HistoryController';

export default [
  {
    path: '/code/:codeId?',
    method: 'get',
    handler: CodeController.get,
  },
  {
    path: '/user',
    method: 'get',
    handler: UserController.get,
  },
  {
    path: '/code/:codeId/members',
    method: 'get',
    handler: CodeController.getMembers,
  },
  {
    path: '/code/:codeId/meta',
    method: 'post',
    handler: CodeController.updateMeta,
  },
  {
    path: '/changeset/:codeId',
    method: 'get',
    handler: CodeController.getChangeset,
  },
  {
    path: '/changeset/:codeId',
    method: 'post',
    handler: CodeController.uploadChangeset,
  },
  {
    path: '/history/:codeId',
    method: 'get',
    handler: HistoryController.get,
  },
  {
    path: '/history/:codeId/revert',
    method: 'post',
    handler: HistoryController.revert,
  },
  {
    path: '/history/:codeId/snapshot',
    method: 'get',
    handler: HistoryController.preview,
  },
];
