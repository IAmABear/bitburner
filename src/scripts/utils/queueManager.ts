type BatchStatus = "hackable" | "fullyGrown" | "fullyHacked" | "needsGrowing";
type Event = {
  id: number;
  server: string;
  status: BatchStatus;
  timeScriptsDone: number;
  script: string;
  threads: number;
};

export default class EventManager {
  queue: Event[];

  constructor() {
    this.queue = [];
  }

  get getQueue(): Event[] {
    return this.queue.sort(
      (eventA: Event, eventB: Event) =>
        eventB.timeScriptsDone - eventA.timeScriptsDone
    );
  }

  addEvent(event: Event): void {
    this.queue.push(event);
  }

  removeEvent(eventId: number): void {
    this.queue = this.queue.filter((event: Event) => event.id !== eventId);
  }

  removeServersFromEvents(servers: string[]): void {
    this.queue = this.queue.filter(
      (event: Event) => !servers.includes(event.server)
    );
  }

  isEventActive(eventId: number): boolean {
    return (
      this.queue.find((event: Event) => event.id === eventId) !== undefined
    );
  }
}
