import "../../../../common/utils/undo-event";
import { createRef, PureComponent } from "react";
import Model, { ApplyType } from "../../../../common/model/Model";
import { ModelUpdateEvent, RoomMemberInfo, UserInfo } from "../../../../common/type";
import Header, { DEFAULT_TITLE } from "../../components/header/Header";
import MonacoDiffEditor from "../../components/monaco/MonacoDiffEditor";
import MonacoEditor from "../../components/monaco/MonacoEditor";
import { getCode, getMembers, getUser, updateMeta } from "../../service/api";
import IO from "../../service/IO";
import Room from "../../service/Room";
import Skeleton from 'antd/lib/skeleton';
import "./Home.less";
import Sync, { SyncState } from "../../service/Sync";
import Changeset from "../../../../common/model/Changeset";
import UndoManager from "../../../../common/undo/UndoManager";
import Operation from "../../../../common/operation/Operation";
import Toolbar from "../../components/toolbar/Toolbar";
import History from "../../components/history/History";
import message from 'antd/lib/message';
import { CodeMeta } from "../../type";

interface HomePageState {
  user: UserInfo | null;
  code: string;
  codeId: string;
  members: RoomMemberInfo[];
  syncState: SyncState;
  canUndo: boolean;
  canRedo: boolean;
  historyOpen: boolean;
  preview: {
    content1: string,
    content2: string,
  } | null;
  meta: CodeMeta;
}

interface HomePageProps {

}

const WEBSITE_NAME = 'Colla Editor';

export default class HomePage extends PureComponent<HomePageProps, HomePageState> {
  private io?: IO;
  private model: Model = new Model('');
  private room?: Room;
  private sync?: Sync;
  private undoManager?: UndoManager;
  private historyRef = createRef<History>();

  constructor(props: HomePageProps) {
    super(props);
    this.state = {
      user: null,
      code: '',
      codeId: '',
      members: [],
      syncState: SyncState.Ready,
      canUndo: false,
      canRedo: false,
      historyOpen: false,
      preview: null,
      meta: {
        title: '',
        language: '',
      },
    };
  }

  async componentDidMount() {
    // fetch data
    const user = await getUser();
    const code = await getCode();
    const members = await getMembers(code.codeId);

    // set url & title
    const path = `/${code.codeId}`;
    if (location.pathname !== path) {
      history.replaceState({}, document.title, path);
    }
    document.title = `${code.title || DEFAULT_TITLE} - ${WEBSITE_NAME}`;

    const model = new Model(code.content);
    this.model = model;
    this.model.addEventListener('update', this.handleModelUpdate);

    const io = new IO(user, code);
    this.io = io;

    const room = new Room(members, io, user);
    this.room = room;
    this.room.addEventListener('update', this.handleMembersUpdate);

    const sync = new Sync(io, code.version, code.metaVersion, code.codeId, user);
    this.sync = sync;
    this.sync.addEventListener('serverChangesets', this.handleServerChangesets);
    this.sync.addEventListener('stateChange', this.handleSyncStateChange);
    this.sync.addEventListener('versionChange', this.handleSyncVersionChange);
    this.sync.addEventListener('metaChange', this.handleMetaChange);

    const undoManager = new UndoManager();
    this.undoManager = undoManager;
    this.undoManager.addEventListener('stackChange', this.handleUndoStackChange);
    this.undoManager.addEventListener('applyChange', this.handleApplyUndoChange);

    this.setState({
      user,
      code: code.content,
      codeId: code.codeId,
      members: room.getMembers(),
      meta: {
        title: code.title,
        language: code.language,
      },
    });
  }

  componentWillUnmount() {
    this.undoManager?.removeEventListener('stackChange', this.handleUndoStackChange);
    this.undoManager?.removeEventListener('applyChange', this.handleApplyUndoChange);
    this.undoManager?.destroy();
    this.sync?.addEventListener('stateChange', this.handleSyncStateChange);
    this.sync?.addEventListener('serverChangesets', this.handleServerChangesets);
    this.sync?.removeEventListener('versionChange', this.handleSyncVersionChange);
    this.sync?.removeEventListener('metaChange', this.handleMetaChange);
    this.sync?.destroy();
    this.room?.addEventListener('update', this.handleMembersUpdate);
    this.io?.close();
    this.model.removeEventListener('update', this.handleModelUpdate);
  }

  render() {
    const {
      code, codeId, user, members, syncState,
      canRedo, canUndo, historyOpen, preview,
      meta,
    } = this.state;

    return user ? (
      <div className="home-page">
        <Header
          user={user}
          members={members}
          syncState={syncState}
          title={meta.title}
          onUpdateTitle={title => this.handleMetaChange({ title }, true)}
        />
        <Toolbar
          canUndo ={canUndo}
          canRedo={canRedo}
          onUndo={() => this.undoManager?.undo()}
          onRedo={() => this.undoManager?.redo()}
          toggleHistory={this.toggleHistory}
          syncState={syncState}
          language={meta.language}
          onUpdateLanguage={language => this.handleMetaChange({ language }, true)}
        />
        <div className="container">
          {!preview && (
            <MonacoEditor
              content={code}
              model={this.model}
              room={this.room!}
              user={user}
              language={meta.language}
              disabled={syncState === SyncState.Error}
            />
          )}
          {preview && (
            <MonacoDiffEditor
              content1={preview.content1}
              content2={preview.content2}
            />
          )}
          {historyOpen && (
            <History
              codeId={codeId}
              user={user}
              onPreview={(c1,c2) => this.setState({ preview: { content1: c1, content2: c2 }})}
              onRevert={v => {
                message.success('restore success');
                this.toggleHistory();
                this.sync?.fetchMissChanges(v);
              }}
              ref={this.historyRef}
            />
          )}
        </div>
      </div>
    ) : (
      <div className="home-page">
        <div className="container">
          <Skeleton active />
        </div>
      </div>
    );
  }

  private toggleHistory = () => {
    if (this.state.historyOpen) {
      this.setState({ preview: null });
    } else {
      const el = document.querySelector('.monaco-editor-container') as HTMLDivElement;
      el.style.width = '100px';
    }
    this.setState({ historyOpen: !this.state.historyOpen });
  }

  private handleModelUpdate = (data: ModelUpdateEvent) => {
    if (data.applyType !== ApplyType.Server) {
      this.sync?.send(data.changesets);
    }
    if (data.applyType === ApplyType.Edit) {
      this.undoManager?.pushChangesets(data.changesets);
    }
    this.setState({
      code: this.model.getContent(),
    });
  }

  private handleMembersUpdate = (members: RoomMemberInfo[]) => {
    this.setState({
      members,
    });
  }

  private handleServerChangesets = (changesets: Changeset[]) => {
    this.model.applyChangesets(changesets, ApplyType.Server);
    this.undoManager?.transformChangesets(changesets);
  }

  private handleSyncStateChange = (data: { state: SyncState }) => {
    if (data.state === SyncState.Error) {
      this.io?.close();
    }
    this.setState({
      syncState: data.state,
    });
  }

  private handleApplyUndoChange = (data: { operations: Operation[], type: ApplyType }) => {
    this.model.applyOperations(data.operations, data.type);
  }

  private handleUndoStackChange = () => {
    this.setState({
      canUndo: !!this.undoManager?.getUndoStackLength(),
      canRedo: !!this.undoManager?.getRedoStackLength(),
    });
  }

  private handleSyncVersionChange = () => {
    this.historyRef.current?.fetchList(true);
  }

  private handleMetaChange = async (meta: Partial<CodeMeta>, sync?: boolean) => {
    this.setState({
      meta: {
        ...this.state.meta,
        ...meta,
      },
    });
    if (meta.title !== undefined) {
      document.title = `${meta.title || DEFAULT_TITLE} - ${WEBSITE_NAME}`;
    }
    sync && await updateMeta(this.state.codeId, this.state.user!.memberId, meta);
  }
}
