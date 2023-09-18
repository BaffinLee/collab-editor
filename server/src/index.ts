import 'reflect-metadata';
import Koa from 'koa';
import { DataSource } from 'typeorm';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import serve from 'koa-static';
import routes from './routes';
import { WebSocketServer } from 'ws';
import RoomService from './service/RoomService';
import HomeController from './controller/HomeController';
import ChangesetEntity from './entity/ChangesetEntity';
import CodeEntity from './entity/CodeEntity';
import SnapshotEntity from './entity/SnapshotEntity';
import UserEntity from './entity/UserEntity';
import { getDataSource } from './datasource';

const port = process.env.PORT || 3123;
const host = '0.0.0.0';

const app = new Koa();
const router = new Router();

routes.forEach(route => {
  router[route.method as 'all'](route.path, route.handler);
});

app.use(serve('public'));
app.use(bodyParser());
app.use(cors({ credentials: true }));
app.use(router.routes());
app.use(HomeController.showHomePage);

getDataSource().initialize().then(() => {
  const server = app.listen(+port, host, () => {
    console.log(`server is now running at http://localhost:${port}`);
  });
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws, req) => RoomService.handleConnection(ws, req));
});
