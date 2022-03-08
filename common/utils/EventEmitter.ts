export default class EventEmitter {
  private eventListenersMap: {
    [eventName: string]: ((event?: any) => void)[],
  } = {};

  addEventListener(eventName: string, callback: (eventData?: any) => void) {
    this.eventListenersMap[eventName] = this.eventListenersMap[eventName] || [];
    this.eventListenersMap[eventName].push(callback);
  }

  removeEventListener(eventName: string, callback: (eventData?: any) => void) {
    this.eventListenersMap[eventName] = (this.eventListenersMap[eventName] || []).filter(listener => listener !== callback);
  }

  triggerEvent(eventName: string, eventData?: any) {
    const eventListeners = this.eventListenersMap[eventName] || [];
    eventListeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        console.error(`error in handler of ${eventName} event`, error);
      }
    });
  }
}
