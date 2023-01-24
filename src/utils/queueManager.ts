type BatchStatus = "hackable" | "fullyGrown" | "fullyHacked" | "needsGrowing";
export type QueueEvent = {
  id: number;
  server: string;
  status: BatchStatus;
  timeScriptsDone: number;
  script: string;
  threads: number;
};

export default class EventManager {
  queue: QueueEvent[];

  constructor() {
    this.queue = [];
  }

  get getQueue(): QueueEvent[] {
    return this.queue.sort(
      (eventA: QueueEvent, eventB: QueueEvent) =>
        eventB.timeScriptsDone - eventA.timeScriptsDone
    );
  }

  addEvent(event: QueueEvent): void {
    this.queue.push(event);
  }

  removeEvent(eventId: number): void {
    this.queue = this.queue.filter((event: QueueEvent) => event.id !== eventId);
  }

  removeServersFromEvents(servers: string[]): void {
    this.queue = this.queue.filter(
      (event: QueueEvent) => !servers.includes(event.server)
    );
  }

  isEventActive(eventId: number): boolean {
    return (
      this.queue.find((event: QueueEvent) => event.id === eventId) !== undefined
    );
  }
}
