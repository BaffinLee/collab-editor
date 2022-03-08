import { PureComponent } from "react";
import * as monaco from 'monaco-editor';
import "./MonacoDiffEditor.less";

interface MonacoDiffEditorProps {
  content1: string;
  content2: string;
}

export default class MonacoDiffEditor extends PureComponent<MonacoDiffEditorProps> {
  private diffEditor?: monaco.editor.IStandaloneDiffEditor;

  componentDidUpdate(prevProps: MonacoDiffEditorProps) {
    if (this.props.content1 !== prevProps.content1 || this.props.content2 !== prevProps.content2) {
      const originalModel = monaco.editor.createModel(this.props.content1);
      const modifiedModel = monaco.editor.createModel(this.props.content2);
      this.diffEditor?.setModel({
        original: originalModel,
        modified: modifiedModel
      });
    }
  }

  componentWillUnmount() {
    this.diffEditor?.dispose();
  }

  render() {
    return (
      <div
        className="monaco-editor-container diff"
        ref={this.setRef}
      />
    );
  }

  private setRef = (ref: HTMLDivElement | null) => {
    if (ref) {
      this.initEditor(ref);
    }
  }

  private initEditor(container: HTMLDivElement) {
    const originalModel = monaco.editor.createModel(this.props.content1);
    const modifiedModel = monaco.editor.createModel(this.props.content2);
    const diffEditor = monaco.editor.createDiffEditor(container, {
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: true,
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      theme: 'vs-light',
      enableSplitViewResizing: false,
      renderSideBySide: false
    });
    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
    this.diffEditor = diffEditor;
  }
}
