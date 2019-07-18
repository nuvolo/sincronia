import chokidar from "chokidar";
export class Watcher {
  watcher?: chokidar.FSWatcher;
  constructor() {
    this.watcher = undefined;
  }
  startWatching(directory: string, eventMap: { [event: string]: any }) {
    this.watcher = chokidar.watch(directory);
    for (let event in eventMap) {
      this.watcher.on(event, eventMap[event]);
    }
  }
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
