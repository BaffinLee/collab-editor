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
  language: string;
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
  private ignoreEditCursor = false;

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
    if (this.props.language !== prevProps.language) {
      monaco.editor.setModelLanguage(this.editor!.getModel()!, this.props.language);
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
    const memberCursorMap:  { [memberId: number]: { rangeStart: number }} = {};
    data.applyType !== ApplyType.Edit && data.changesets.forEach(changeset => {
      changeset.operations.forEach(operation => {
        const editorModel = this.editor?.getModel();
        editorModel?.applyEdits([{
          text: operation.text,
          range: (editorModel as any).getRangeAt(operation.rangeStart, operation.rangeEnd),
        }]);
      });
      if (changeset.memberId && changeset.operations.length) {
        const operation = changeset.operations[changeset.operations.length - 1];
        const offset = operation.rangeEnd + operation.text.length - (operation.rangeEnd - operation.rangeStart);
        memberCursorMap[changeset.memberId] = {
          rangeStart: offset,
        };
      }
    });
    this.props.room.updateMemberCursor(memberCursorMap);
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
      language: this.props.language || 'typescript',
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

      if (!this.ignoreEditCursor) {
        this.ignoreEditCursor = true;
        Promise.resolve().then(() => {
          this.ignoreEditCursor = false;
        });
      }
    });
    this.editor.onDidChangeCursorPosition(data => {
      if (this.ignoreEditCursor) {
        return;
      }
      const model = this.editor?.getModel();
      this.lastCursorOffset = model ? model.getOffsetAt(data.position) : this.lastCursorOffset;
      if (this.sendCursorTimer) {
        return;
      }
      this.sendCursorTimer = window.setTimeout(() => {
        this.sendCursorTimer = 0;
        this.props.room.sendMemberCursor({
          ...this.props.user,
          rangeStart: this.lastCursorOffset,
        });
      }, 1000);
    });
  }

  private handleRoomUpdate = (members: RoomMemberInfo[]) => {
    const model = this.editor?.getModel();
    if (!model) return;

    const oldMap = this.cursorMap;
    this.cursorMap = {};
    members.forEach(member => {
      if (member.memberId === this.props.user.memberId) return;
      if (!member.cursor) return;
      const cursor = oldMap[member.memberId] || new MonacoWidget(
        member.color!,
        member.name,
        member.memberId,
      );
      cursor.setPosition(
        model.getPositionAt(member.cursor.rangeStart),
        member.cursor.rangeStart,
      );
      this.cursorMap[member.memberId] = cursor;
      oldMap[member.memberId]
        ? this.editor?.layoutContentWidget(cursor)
        : this.editor?.addContentWidget(cursor);
    });
    Object.keys(oldMap).forEach(id => {
      if (!this.cursorMap[+id]) {
        this.editor?.removeContentWidget(oldMap[+id]);
      }
    });
  }
}
