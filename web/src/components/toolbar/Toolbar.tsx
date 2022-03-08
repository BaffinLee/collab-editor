import { PureComponent } from "react";
import "./Toolbar.less";
import UndoSVG from "../../static/image/undo.svg?component";
import RedoSVG from "../../static/image/redo.svg?component";
import HistorySVG from "../../static/image/history.svg?component";
import classnames from 'classnames';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  toggleHistory: () => void;
}

export default class Toolbar extends PureComponent<ToolbarProps> {
  render() {
    const { canRedo, canUndo, onRedo, onUndo, toggleHistory } = this.props;

    return (
      <div className="toolbar">
        <div className="container">
          <div
            className={classnames('btn', {
              disabled: !canUndo,
            })}
            onClick={onUndo}
            title="undo"
          >
            <UndoSVG />
          </div>
          <div
            className={classnames('btn', {
              disabled: !canRedo,
            })}
            onClick={onRedo}
            title="redo"
          >
            <RedoSVG />
          </div>
          <div
            className="btn"
            onClick={toggleHistory}
            title="history"
          >
            <HistorySVG />
          </div>
        </div>
      </div>
    );
  }
}
