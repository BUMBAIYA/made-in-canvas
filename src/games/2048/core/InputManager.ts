export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface InputEvent {
  direction: Direction;
  timestamp: number;
}

export class InputManager {
  private listeners: ((event: InputEvent) => void)[] = [];
  private keyMap: Record<string, Direction> = {
    ArrowUp: "UP",
    ArrowDown: "DOWN",
    ArrowLeft: "LEFT",
    ArrowRight: "RIGHT",
    w: "UP",
    s: "DOWN",
    a: "LEFT",
    d: "RIGHT",
    W: "UP",
    S: "DOWN",
    A: "LEFT",
    D: "RIGHT",
  };

  constructor() {
    this.setupEventListeners();
  }

  public addListener(callback: (event: InputEvent) => void): void {
    this.listeners.push(callback);
  }

  public removeListener(callback: (event: InputEvent) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private setupEventListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const direction = this.keyMap[event.key];
    if (direction) {
      event.preventDefault();
      this.notifyListeners({
        direction,
        timestamp: Date.now(),
      });
    }
  }

  private notifyListeners(event: InputEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  public cleanup(): void {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    this.listeners = [];
  }
}
