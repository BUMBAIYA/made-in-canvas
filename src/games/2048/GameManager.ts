import { randomNumberInRange } from "@/utils/randomNumberInRange";

const MIN_GRID_GUTTER_SIZE = 8;

/**
 * Base gutter percentage for 4x4 grid
 */
const DEFAULT_GUTTER_SIZE_PERCENTAGE = 2.5;
const DEFAULT_BOARD_SIZE = 4;

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

export class GameManager {
  private gameBoardContainer: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rendererData: RendererData;
  private boardSize: number;
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

  constructor(
    gameBoardContainer: HTMLDivElement,
    cellCount: number = DEFAULT_BOARD_SIZE,
  ) {
    this.gameBoardContainer = gameBoardContainer;
    this.boardSize = cellCount;
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.margin = "0 auto";
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.rendererData = this.calculateCanvasDimensions();

    this.resizeCanvas();
    this.render();
    this.gameBoardContainer.appendChild(this.canvas);
  }

  public attachListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  public cleanup() {
    window.removeEventListener("resize", this.onWindowResize.bind(this));
  }

  public render() {
    this.clearCanvas();
    this.drawBoardBackground();
    this.drawBoardBackgroundGrid();
  }

  public startNewGame() {
    this.render();
    // Testing text rendering tile
    const row = Math.floor(randomNumberInRange(0, this.boardSize));
    const col = Math.floor(randomNumberInRange(0, this.boardSize));
    this.drawTile(row, col, 2);
    this.drawTile(col, row, 4);
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
