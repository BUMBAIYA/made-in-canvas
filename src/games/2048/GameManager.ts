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

export class GameManager {
  private gameBoardContainer: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rendererData: RendererData;
  private boardSize: number;
  private colors = {
    background: "#9c8a7b",
    cell: "#bdac97",
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
    this.canvas.width = this.rendererData.width;
    this.canvas.height = this.rendererData.height;
    this.canvas.style.width = `${this.rendererData.width}px`;
    this.canvas.style.height = `${this.rendererData.height}px`;
    this.gameBoardContainer.appendChild(this.canvas);
  }

  public render() {
    this.drawBoardBackground();
    this.drawBoardBackgroundGrid();
  }

  private calculateCanvasDimensions() {
    const containerRect = this.gameBoardContainer.getBoundingClientRect();
    const smallestContainerDimension = Math.min(
      containerRect.width,
      containerRect.height,
    );

    const cellCount = this.boardSize;

    // Our multipler factor is (4 / cellcount) as we using base percentage for 4x4 grid.
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

  /**
   * Draws a rounded rectangle
   * @param x - The x coordinate of the rectangle
   * @param y - The y coordinate of the rectangle
   * @param width - The width of the rectangle
   * @param height - The height of the rectangle
   * @param radius - The radius of the rounded corners
   */
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
