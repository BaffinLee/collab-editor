import { PureComponent } from "react";
import * as monaco from 'monaco-editor';
import "./MonacoEditor.less";
import Model, { ApplyType } from "../../../../common/model/Model";
import Operation, { OperationType } from "../../../../common/operation/Operation";
import { ModelUpdateEvent, RoomMemberInfo, UserInfo } from "../../../../common/type";
import Room from "../../service/Room";
import MonacoWidget from "./MonacoWidget";

interface MonacoEditorProps {
  content: string;
  model: Model;
  room: Room;
  user: UserInfo;
  disabled?: boolean;
}

export default class MonacoEditor extends PureComponent<MonacoEditorProps> {
  private editor?: monaco.editor.ICodeEditor;
  private isApplying: boolean = false;
  private cursorMap: {
    [memberId: number]: MonacoWidget;
  } = {};
  private sendCursorTimer: number = 0;
  private lastCursorOffset = 0;

  componentDidMount() {
    this.props.model.addEventListener('update', this.handleModelUpdate);
    this.props.room.addEventListener('update', this.handleRoomUpdate);
  }

  componentDidUpdate(prevProps: MonacoEditorProps) {
    if (this.props.disabled !== prevProps.disabled) {
      this.editor?.updateOptions({
        readOnly: this.props.disabled,
      });
    }
  }

  componentWillUnmount() {
    this.editor?.dispose();
    this.props.model.removeEventListener('update', this.handleModelUpdate);
    this.props.room.removeEventListener('update', this.handleRoomUpdate);
  }

  render() {
    return (
      <div
        className="monaco-editor-container"
        ref={this.onRef}
      />
    );
  }

  private handleModelUpdate = (data: ModelUpdateEvent) => {
    this.isApplying = true;
    // this.props.room.transformCursor(data.changesets);
    data.applyType !== ApplyType.Edit && data.changesets.forEach(changeset => {
      changeset.operations.forEach(operation => {
        const editorModel = this.editor?.getModel();
        editorModel?.applyEdits([{
          text: operation.text,
          range: (editorModel as any).getRangeAt(operation.rangeStart, operation.rangeEnd),
        }]);
      });
    });
    this.isApplying = false;
  }

  private onRef = (ref: HTMLDivElement | null) => {
    if (ref) {
      this.initEditor(ref);
    }
  }
  
  private initEditor(container: HTMLDivElement) {
    this.editor = monaco.editor.create(container, {
      value: this.props.content,
      language: 'typescript',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: this.props.disabled,
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      theme: 'vs-light',
    });
    this.editor.onDidChangeModelContent(event => {
      if (this.isApplying) {
        return;
      }
      const operations: Operation[] = event.changes.map(change => {
        return new Operation(
          change.text === ''
            ? OperationType.Delete
            : (change.rangeLength === 0 ? OperationType.Insert : OperationType.Update),
          change.text,
          this.props.model.getContent().slice(
            change.rangeOffset,
            change.rangeOffset + change.rangeLength,
          ),
          change.rangeOffset,
          change.rangeOffset + change.rangeLength,
        );
      });
      this.props.model.applyOperations(operations, ApplyType.Edit);
    });
    this.editor.onDidChangeCursorPosition(data => {
      this.lastCursorOffset = this.editor?.getModel()?.getOffsetAt(data.position) || this.lastCursorOffset;
      if (this.sendCursorTimer) {
        return;
      }
      this.sendCursorTimer = window.setTimeout(() => {
        this.sendCursorTimer = 0;
        this.props.room.updateUserCursor({
          ...this.props.user,
          rangeStart: this.lastCursorOffset,
        });
      }, 1000);
    });
  }

  private handleRoomUpdate = (members: RoomMemberInfo[]) => {
    const oldMap = this.cursorMap;
    this.cursorMap = {};
    members.forEach(member => {
      if (member.memberId === this.props.user.memberId) return;
      const cursor = oldMap[member.memberId] || new MonacoWidget(
        member.color!,
        member.name,
        member.memberId,
      );
      const model = this.editor?.getModel();
      model && member.cursor && cursor.setPosition(model.getPositionAt(member.cursor.rangeStart), this.isApplying);
      this.cursorMap[member.memberId] = cursor;
      this.editor?.addContentWidget(cursor);
    });
    Object.keys(oldMap).forEach(id => {
      if (!this.cursorMap[+id]) {
        this.editor?.removeContentWidget(oldMap[+id]);
      }
    });
  }
}
