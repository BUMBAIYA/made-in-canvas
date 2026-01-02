const MIN_GRID_GUTTER_SIZE = 8;

/**
 * Base gutter percentage for 4x4 grid
 */
const DEFAULT_GUTTER_SIZE_PERCENTAGE = 2.5;
const DEFAULT_BOARD_SIZE = 4;
const DEFAULT_TARGET_SCORE = 2048;

type RendererData = {
  width: number;
  height: number;
  gridSize: number;
  gridGutterSize: number;
  gridCellSize: number;
  boardBackgroundRadius: number;
};

type Colors = {
  background: string;
  cell: string;
  text: string;
  textLight: string;
  tile: Record<number, string>;
};

type GameGridStateType = {
  id: number;
  value: number;
  position: {
    row: number;
    col: number;
  };
};

type GameState = {
  grid: Array<Array<GameGridStateType | null>>;
  score: number;
  moveCount: number;
  currentGameState: "playing" | "won" | "lost";
};

const DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 }, // right
];

export class GameManager {
  private gameBoardContainer: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rendererData: RendererData;
  private boardSize: number;
  private targetScore = DEFAULT_TARGET_SCORE;
  private uiStateListeners: ((event: GameState) => void)[] = [];
  private colors: Colors = {
    background: "#9c8a7b",
    cell: "#bdac97",
    tile: {
      0: "#ff0000",
      2: "#eee5da",
      4: "#ebd8b6",
      8: "#f2b178",
      16: "#f79461",
      32: "#f78165",
      64: "#f76443",
      128: "#f1d068",
      256: "#f3d261",
      512: "#edc850",
      1024: "#edc53f",
      2048: "#edc22e",
    },
    text: "#776e65",
    textLight: "#ffffff",
  };

  private inputManager: InputManager;
  private gameState: GameState;

  constructor(
    gameBoardContainer: HTMLDivElement,
    cellCount: number = DEFAULT_BOARD_SIZE,
  ) {
    this.inputManager = new InputManager();

    this.gameBoardContainer = gameBoardContainer;
    this.boardSize = cellCount;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.rendererData = this.calculateCanvasDimensions();

    this.resizeCanvas();
    this.gameState = this.initGameState();
    this.render();
    this.gameBoardContainer.appendChild(this.canvas);

    this.attachListeners();
  }

  public attachGameUIStateListener(listener: (event: GameState) => void) {
    this.uiStateListeners.push(listener);
  }

  private notifyUIStateListener() {
    this.uiStateListeners.forEach((listener) => {
      listener(this.gameState);
    });
  }

  private initGameState() {
    const grid = Array(this.rendererData.gridSize)
      .fill(null)
      .map(() => Array(this.rendererData.gridSize).fill(null));

    const newGameState: GameState = {
      grid: grid,
      score: 0,
      moveCount: 0,
      currentGameState: "playing",
    };

    return newGameState;
  }

  private addRandomTile(): void {
    const emptyCells: GameGridStateType["position"][] = [];

    for (let y = 0; y < this.rendererData.gridSize; y++) {
      for (let x = 0; x < this.rendererData.gridSize; x++) {
        if (this.gameState.grid[y][x] === null) {
          emptyCells.push({ row: y, col: x });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell =
        emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;

      this.gameState.grid[randomCell.row][randomCell.col] = {
        value,
        position: randomCell,
        id: Math.random(),
      };
    }
  }

  private attachListeners() {
    this.inputManager.addListener(this.onUserInputEvent.bind(this));
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  public cleanup() {
    this.inputManager.cleanup();
    this.uiStateListeners = [];
    window.removeEventListener("resize", this.onWindowResize.bind(this));
  }

  public render() {
    this.clearCanvas();
    this.drawBoardBackground();
    this.drawBoardBackgroundGrid();
    this.drawTiles();
  }

  public startNewGame() {
    this.gameState = this.initGameState();
    this.render();
    // Testing text rendering tile
    this.addRandomTile();
    this.addRandomTile();
    this.drawTiles();
    this.notifyUIStateListener();
  }

  private resizeCanvas() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#correcting_resolution_in_a_canvas
    // We need set actual canvas size in memory and then scale down using css to maintain pixel perfect rendering
    // to account for high resolution retina displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.rendererData.width * dpr;
    this.canvas.height = this.rendererData.height * dpr;
    this.canvas.style.width = `${this.rendererData.width}px`;
    this.canvas.style.height = `${this.rendererData.height}px`;
    this.ctx.scale(dpr, dpr); // Normalize coordinate system to use CSS pixels.
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.rendererData.width, this.rendererData.height);
  }

  private drawTiles() {
    for (let row = 0; row < this.gameState.grid.length; row++) {
      for (let col = 0; col < this.gameState.grid[row].length; col++) {
        const tile = this.gameState.grid[row][col];
        if (tile) {
          this.drawTile(row, col, tile.value);
        }
      }
    }
  }

  private drawTile(row: number, col: number, value: number): void {
    const padding = this.rendererData.gridGutterSize;
    const cellSize = this.rendererData.gridCellSize;

    const x = padding + col * cellSize + col * padding;
    const y = padding + row * cellSize + row * padding;
    const tileColor = this.colors.tile[value] || this.colors.tile[0];
    this.ctx.fillStyle = tileColor;

    this.roundRect(x, y, cellSize, cellSize, padding);
    this.drawTileText(value, x, y, cellSize);
  }

  private calculateCanvasDimensions() {
    const containerRect = this.gameBoardContainer.getBoundingClientRect();
    const smallestContainerDimension = Math.min(
      containerRect.width,
      containerRect.height,
    );

    const cellCount = this.boardSize;

    // Our multiplier factor is (4 / cellCount) as we using base percentage for 4x4 grid.
    const gutterPercentage = DEFAULT_GUTTER_SIZE_PERCENTAGE * (4 / cellCount);

    const gutter = Math.max(
      Math.floor((smallestContainerDimension / 100) * gutterPercentage),
      MIN_GRID_GUTTER_SIZE,
    );
    const cellSize = Math.floor(
      (smallestContainerDimension - gutter * (cellCount + 1)) / cellCount,
    );

    const size = cellSize * cellCount + gutter * (cellCount + 1);

    return {
      height: size,
      width: size,
      gridSize: cellCount,
      gridGutterSize: gutter,
      gridCellSize: cellSize,
      boardBackgroundRadius: Math.floor(gutter * 1.75), // found 1.75 to look good on all grid sizes
    };
  }

  private onWindowResize(): void {
    const _rendererData = this.calculateCanvasDimensions();

    if (
      this.rendererData.width === _rendererData.width &&
      this.rendererData.height === _rendererData.height
    ) {
      return;
    }

    this.rendererData = _rendererData;
    this.resizeCanvas();
    this.render();
  }

  private onUserInputEvent(event: InputEvent): void {
    const isTiledMoved = this.moveTileEvent(event.direction);
    if (isTiledMoved) {
      this.render();
    }
  }

  private moveTileEvent(direction: InputEvent["direction"]) {
    if (this.gameState.currentGameState !== "playing") return false;

    let moved = false;

    switch (direction) {
      case "UP":
        moved = this.moveUp();
        break;
      case "DOWN":
        moved = this.moveDown();
        break;
      case "LEFT":
        moved = this.moveLeft();
        break;
      case "RIGHT":
        moved = this.moveRight();
        break;
    }

    if (moved) {
      this.gameState.moveCount++;
      this.addRandomTile();
      this.checkGameState();
      this.notifyUIStateListener();
    }

    return moved;
  }

  private drawBoardBackgroundGrid(): void {
    this.ctx.fillStyle = this.colors.cell;

    const cellSize = this.rendererData.gridCellSize;
    const padding = this.rendererData.gridGutterSize;
    const gridSize = this.rendererData.gridSize;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = padding + col * (cellSize + padding);
        const y = padding + row * (cellSize + padding);
        this.roundRect(x, y, cellSize, cellSize, padding);
      }
    }
  }

  private drawBoardBackground(): void {
    this.ctx.fillStyle = this.colors.background;
    this.roundRect(
      0,
      0,
      this.rendererData.width,
      this.rendererData.height,
      this.rendererData.boardBackgroundRadius,
    );
  }

  private moveUp(): boolean {
    let moved = false;
    for (let col = 0; col < this.rendererData.gridSize; col++) {
      const column = this.getColumn(col);
      const newColumn = this.mergeTiles(column);
      if (this.arraysEqual(column, newColumn)) continue;

      moved = true;
      this.setColumn(col, newColumn);
    }
    return moved;
  }

  private moveDown(): boolean {
    let moved = false;
    for (let col = 0; col < this.boardSize; col++) {
      const column = this.getColumn(col).reverse();
      const newColumn = this.mergeTiles(column).reverse();
      if (this.arraysEqual(this.getColumn(col), newColumn)) continue;

      moved = true;
      this.setColumn(col, newColumn);
    }
    return moved;
  }

  private moveLeft(): boolean {
    let moved = false;
    for (let row = 0; row < this.boardSize; row++) {
      const rowTiles = this.getRow(row);
      const newRow = this.mergeTiles(rowTiles);
      if (this.arraysEqual(rowTiles, newRow)) continue;

      moved = true;
      this.setRow(row, newRow);
    }
    return moved;
  }

  private moveRight(): boolean {
    let moved = false;
    for (let row = 0; row < this.boardSize; row++) {
      const rowTiles = this.getRow(row).reverse();
      const newRow = this.mergeTiles(rowTiles).reverse();
      if (this.arraysEqual(this.getRow(row), newRow)) continue;

      moved = true;
      this.setRow(row, newRow);
    }
    return moved;
  }

  private mergeTiles(
    tiles: (GameGridStateType | null)[],
  ): (GameGridStateType | null)[] {
    const filtered = tiles.filter(
      (tile) => tile !== null,
    ) as GameGridStateType[];
    const merged: (GameGridStateType | null)[] = [];
    let i = 0;

    while (i < filtered.length) {
      if (
        i < filtered.length - 1 &&
        filtered[i].value === filtered[i + 1].value
      ) {
        const mergedTile: GameGridStateType = {
          value: filtered[i].value * 2,
          position: filtered[i].position,
          id: Math.random(),
        };
        merged.push(mergedTile);
        this.gameState.score += mergedTile.value;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }

    while (merged.length < this.boardSize) {
      merged.push(null);
    }

    return merged;
  }

  private getColumn(col: number): (GameGridStateType | null)[] {
    return this.gameState.grid.map((row) => row[col]);
  }

  private setColumn(col: number, tiles: (GameGridStateType | null)[]): void {
    tiles.forEach((tile, row) => {
      if (tile) {
        tile.position = { row: row, col: col };
      }
      this.gameState.grid[row][col] = tile;
    });
  }

  private getRow(row: number): (GameGridStateType | null)[] {
    return [...this.gameState.grid[row]];
  }

  private setRow(row: number, tiles: (GameGridStateType | null)[]): void {
    tiles.forEach((tile, col) => {
      if (tile) {
        tile.position = { row: row, col: col };
      }
      this.gameState.grid[row][col] = tile;
    });
  }

  private arraysEqual(
    a: (GameGridStateType | null)[],
    b: (GameGridStateType | null)[],
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.value !== b[i]?.value) return false;
    }
    return true;
  }

  private checkGameState(): void {
    if (this.gameState.currentGameState !== "won" && this.hasWinningTile()) {
      this.gameState.currentGameState = "won";
    }

    if (this.isGameOver()) {
      this.gameState.currentGameState = "lost";
    }
  }

  private hasWinningTile(): boolean {
    return this.gameState.grid.some((row) =>
      row.some((tile) => tile && tile.value >= this.targetScore),
    );
  }

  private isGameOver(): boolean {
    for (let y = 0; y < this.boardSize; y++) {
      for (let x = 0; x < this.boardSize; x++) {
        if (this.gameState.grid[y][x] === null) {
          return false;
        }
      }
    }

    for (let y = 0; y < this.boardSize; y++) {
      for (let x = 0; x < this.boardSize; x++) {
        const current = this.gameState.grid[y][x];
        if (!current) continue;

        for (const dir of DIRECTIONS) {
          const newX = x + dir.x;
          const newY = y + dir.y;

          if (
            newX >= 0 &&
            newX < this.boardSize &&
            newY >= 0 &&
            newY < this.boardSize
          ) {
            const adjacent = this.gameState.grid[newY][newX];
            if (!adjacent || adjacent.value === current.value) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  private drawTileText(
    value: number,
    x: number,
    y: number,
    cellSize: number,
  ): void {
    const text = value.toString();
    const fontSize = cellSize / 2;

    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "alphabetic";

    this.ctx.fillStyle = value <= 4 ? this.colors.text : this.colors.textLight;

    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2 + fontSize * 0.38;

    this.ctx.fillText(text, centerX, centerY);
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }
}

// ---------- User Input Manager ----------

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface InputEvent {
  direction: Direction;
  timestamp: number;
}

class InputManager {
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
