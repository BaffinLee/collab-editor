import { createRef, PureComponent } from "react";
import "./Toolbar.less";
import UndoSVG from "../../static/image/undo.svg?component";
import RedoSVG from "../../static/image/redo.svg?component";
import HistorySVG from "../../static/image/history.svg?component";
import classnames from 'classnames';
import { SyncState } from "../../service/Sync";
import Select from 'antd/lib/select';
import Tooltip from 'antd/lib/tooltip';
import type { BaseSelectRef } from 'rc-select';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  toggleHistory: () => void;
  syncState: SyncState;
  language: string;
  onUpdateLanguage: (language: string) => void;
}

const LANGUAGES = [
  'abap','aes','apex','azcli','bat','bicep','c','cameligo','clojure','coffeescript','cpp','csharp',
  'csp','css','dart','dockerfile','ecl','elixir','flow9','freemarker2','fsharp','go','graphql','handlebars','hcl','html','ini',
  'java','javascript','json','julia','kotlin','less','lexon','liquid','lua','m3','markdown','mips','msdax',
  'mysql','objective-c','pascal','pascaligo','perl','pgsql','php','pla','plaintext','postiats','powerquery',
  'powershell','proto','pug','python','qsharp','r','razor','redis','redshift','restructuredtext','ruby',
  'rust','sb','scala','scheme','scss','shell','sol','sparql','sql','st','swift','systemverilog','tcl','twig',
  'typescript','vb','verilog','xml','yaml',
];

export default class Toolbar extends PureComponent<ToolbarProps> {
  private selectRef = createRef<BaseSelectRef>();

  render() {
    const {
      syncState, language, onUpdateLanguage,
    } = this.props;

    return (
      <div className="toolbar">
        <div className="container">
          <div className="left">
            <Select
              showSearch
              value={language || 'typescript'}
              onChange={value => {
                onUpdateLanguage(value);
                this.selectRef.current?.blur();
              }}
              dropdownMatchSelectWidth={false}
              size="small"
              removeIcon={false}
              ref={this.selectRef}
              disabled={syncState === SyncState.Offline}
            >
              {LANGUAGES.map(lang => (
                <Select.Option
                  value={lang}
                  key={lang}
                >{lang}</Select.Option>
              ))}
            </Select>
          </div>
          {this.getButtons().map(button => (
            <Tooltip
              title={button.title}
              key={button.title}
            >
              <div
                className={classnames('btn', {
                  disabled: button.disabled,
                })}
                onClick={button.onClick}
              >
                <button.icon />
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  private getButtons() {
    const {
      canRedo, canUndo, onRedo,
      onUndo, toggleHistory,
      syncState,
    } = this.props;
    return [
      {
        title: 'undo',
        onClick: onUndo,
        disabled: !canUndo,
        icon: UndoSVG,
      },
      {
        title: 'redo',
        onClick: onRedo,
        disabled: !canRedo,
        icon: RedoSVG,
      },
      {
        title: 'history',
        onClick: toggleHistory,
        disabled: syncState === SyncState.Offline,
        icon: HistorySVG,
      },
    ];
  }
}
