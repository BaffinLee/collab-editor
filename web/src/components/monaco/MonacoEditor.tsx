import { PureComponent } from "react";
import * as monaco from 'monaco-editor';
import "./MonacoEditor.less";
import Model, { ApplyType } from "../../../../common/model/Model";
import Operation, { OperationType } from "../../../../common/operation/Operation";
import { ModelUpdateEvent } from "../../../../common/type";

interface MonacoEditorProps {
  content: string;
  model: Model;
  disabled?: boolean;
}

export default class MonacoEditor extends PureComponent<MonacoEditorProps> {
  private editor?: monaco.editor.ICodeEditor;
  private isApplying: boolean = false

  componentDidMount() {
    this.props.model.addEventListener('update', this.handleModelUpdate);
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
    if (data.applyType === ApplyType.Edit) {
      return;
    }
    this.isApplying = true;
    data.changesets.forEach(changeset => {
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
  }
}
