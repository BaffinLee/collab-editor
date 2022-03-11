import { PureComponent } from "react";
import { RoomMemberInfo, UserInfo } from "../../../../common/type";
import { SyncState } from "../../service/Sync";
import classnames from "classnames";
import Tooltip from 'antd/lib/tooltip';
import "./Header.less";

interface HeaderProps {
  members: RoomMemberInfo[];
  user: UserInfo;
  syncState: SyncState;
  title: string;
  onUpdateTitle: (title: string) => void;
}

interface HeaderState {
  title: string;
}

export const DEFAULT_TITLE = 'Untitled code';

export default class Header extends PureComponent<HeaderProps, HeaderState> {
  constructor(props: HeaderProps) {
    super(props);
    this.state = {
      title: props.title,
    };
  }

  componentDidUpdate(prevProps: HeaderProps) {
    if (this.props.title !== prevProps.title) {
      this.setState({ title: this.props.title });
    }
  }

  render() {
    const { onUpdateTitle, syncState } = this.props;
    let { members, user } = this.props;
    let map: { [userId: number]: boolean } = {};
    user = members.find(member => member.id === user.id) || user;
    members = members.filter(member => {
      if (map[member.id]) {
        return false;
      }
      map[member.id] = true;
      return member.id !== user.id;
    });

    return (
      <div className="page-header">
        <div className="left">
          <div className="logo">
            <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <path d="M192 96v832h640V307.008l-8.992-10.016-192-192L620.992 96z m64 64h320v192h192v512H256z m384 46.016L722.016 288H640zM512 416l-64 384h64l64-384z m-120.992 76l-80 96-16.992 20 16.96 20 80 96 50.016-40L377.984 608l63.04-76z m241.984 0l-49.984 40L645.984 608l-62.976 76 49.984 40 80-96 17.024-20-17.024-20z"></path>
            </svg>
          </div>
          <div className="name">
            <input
              type="text"
              className={classnames('title', {
                disabled: syncState === SyncState.Offline,
              })}
              value={this.state.title}
              disabled={syncState === SyncState.Offline}
              onChange={e => this.setState({ title: e.target.value })}
              onBlur={e => {
                this.setState({ title: e.target.value.trim() });
                onUpdateTitle(e.target.value.trim());
              }}
              onKeyDown={e => e.code === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder={DEFAULT_TITLE}
            />
            <div className="desc">{this.getSyncDesc()}</div>
          </div>
        </div>
        <div className="right">
          {members.map(member => (
            <Tooltip title={member.name} key={member.id}>
              <div className="people">
                <img src={member.avatar} alt="people" />
                <div className="dot" style={{ backgroundColor: member.color }}></div>
              </div>
            </Tooltip>
          ))}
          {members.length !== 0 && <div className="divider"></div>}
          <Tooltip title={user.name} placement="bottomRight">
            <div className="people">
              <img src={user.avatar} alt="people" />
              <div className="dot" style={{ backgroundColor: (user as RoomMemberInfo).color }}></div>
            </div>
          </Tooltip>
        </div>
      </div>
    );
  }

  private getSyncDesc() {
    const map = {
      [SyncState.Ready]: 'Saved',
      [SyncState.Uploading]: 'Saving...',
      [SyncState.Downloading]: 'Fetching...',
      [SyncState.Error]: 'Error',
      [SyncState.Offline]: 'Offline',
    };
    return map[this.props.syncState];
  }
}
