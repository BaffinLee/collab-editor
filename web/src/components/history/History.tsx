import { PureComponent } from "react";
import Changeset from "../../../../common/model/Changeset";
import { UserInfo } from "../../../../common/type";
import { getHistory, getSnapshot, revertHistory } from "../../service/api";
import VirtualList from 'react-tiny-virtual-list';
import "./History.less";
import dayjs from "dayjs";
import Skeleton from 'antd/lib/skeleton';
import Empty from 'antd/lib/empty';
import EyeSVG from "../../static/image/eye.svg?component";
import RevertSVG from "../../static/image/revert.svg?component";
import Model, { ApplyType } from "../../../../common/model/Model";
import { convertChangesets } from "../../../../common/utils/type";

interface HistoryProps {
  codeId: string;
  user: UserInfo;
  onPreview: (contentA: string, contentB: string) => void;
  onRevert: (latestVersion: number) => void;
}

interface HistoryState {
  list: (Changeset & {
    createTime?: string;
    user?: UserInfo;
  })[];
  loading: boolean;
}

export default class History extends PureComponent<HistoryProps, HistoryState> {
  private isFetching = false;

  constructor(props: HistoryProps) {
    super(props);
    this.state = {
      list: [],
      loading: true,
    };
  }

  componentDidMount() {
    this.fetchList();
  }

  async fetchList(hideLoading?: boolean) {
    if (this.isFetching) return;
    this.isFetching = true;
    this.setState({ loading: !hideLoading });
    const list = await getHistory(this.props.codeId);
    this.setState({ loading: false, list });
    this.isFetching = false;
  }

  private async handleRevert(baseVersion: number) {
    const data = await revertHistory(this.props.codeId, this.props.user.memberId, baseVersion);
    this.props.onRevert(data.version);
  }

  private async handlePreview(item: Changeset) {
    const data = await getSnapshot(this.props.codeId, item.baseVersion!);
    const model = new Model(data.content);
    model.applyChangesets(convertChangesets([item]), ApplyType.Server);
    this.props.onPreview(data.content, model.getContent());
  }

  render() {
    const { list, loading } = this.state;

    return (
      <div className="history">
        {loading && <Skeleton active />}
        {!loading && list.length === 0 && <Empty description="" />}
        {!loading && list.length !== 0 && <VirtualList
          width="100%"
          height="100%"
          itemCount={this.state.list.length}
          itemSize={70}
          overscanCount={20}
          renderItem={({index, style}) => (
            <div className="item" key={index} style={style} onClick={() => this.handlePreview(list[index])}>
              <div className="flex">
                <div className="user" title={list[index].user!.name}>
                  <img src={list[index].user!.avatar} alt="user" />
                </div>
                <div className="desc">
                  <div className="title">#{list[index].baseVersion! + 1}</div>
                  <div className="time">{dayjs(list[index].createTime).fromNow()}</div>
                </div>
              </div>
              <div className="btns">
                <div
                  className="btn"
                  onClick={() => this.handlePreview(list[index])}
                  title="preview"
                >
                  <EyeSVG />
                </div>
                <div
                  className="btn"
                  onClick={e => {
                    this.handleRevert(list[index].baseVersion!);
                    e.stopPropagation();
                  }}
                  title="revert"
                >
                  <RevertSVG />
                </div>
              </div>
            </div>
          )}
        />}
      </div>
    );
  }
}
