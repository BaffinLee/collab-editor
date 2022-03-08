const isMac = navigator.userAgent.match(/Macintosh/i);

// disable monaco's undo/redo
window.addEventListener('keydown', event => {
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
  if (event.code === 'KeyZ' && ctrlKey && !event.shiftKey) {
    window.dispatchEvent(new Event('undo'));
  } else if ((event.code === 'KeyZ' && ctrlKey && event.shiftKey) || (event.code === 'KeyY' && ctrlKey)) {
    window.dispatchEvent(new Event('redo'));
  } else {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}, true);

export function addEventListener(eventName: 'undo' | 'redo', listener: () => void) {
  window.addEventListener(eventName, listener);
}

export function removeEventListener(eventName: 'undo' | 'redo', listener: () => void) {
  window.addEventListener(eventName, listener);
}
