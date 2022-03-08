
import * as monaco from 'monaco-editor';
import "./MonacoWidget.less";

interface Position {
  lineNumber: number,
  column: number,
}

export default class MonacoWidget {
  private domNode: null | HTMLDivElement;
  private position: Position = {
    lineNumber: 3,
    column: 3,
  };
  private timer: number = 0;

  constructor(
    private color: string,
    private name: string,
    private memberId: number,
  ) {

  }

  getId() {
    return `cursorWidgetFor${this.memberId}`;
  }

  getDomNode() {
    if (!this.domNode) {
      const div = document.createElement('div');
      div.className = 'member-cursor';
      div.style.backgroundColor = this.color;
  
      const flag = document.createElement('div');
      flag.className = 'member-cursor-flag';
      flag.style.backgroundColor = this.color;

      const text = document.createElement('span');
      text.textContent = this.name;
  
      flag.appendChild(text);
      div.appendChild(flag);
      this.domNode = div;
    }
    return this.domNode;
  }

  getPosition() {
    return {
      position: this.position,
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
    };
  }

  setPosition(position: Position, doNotOpen?: boolean) {
    this.position = position;
    if (doNotOpen) return;

    this.domNode?.classList.add('open');
    this.timer && window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.domNode?.classList.remove('open');
    }, 3000);
  }
}
