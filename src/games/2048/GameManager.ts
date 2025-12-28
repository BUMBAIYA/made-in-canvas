const DEFAULT_CELL_COUNT = 4;

type RendererData = {
  width: number;
  height: number;
};

export class GameManager {
  private gameBoardContainer: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rendererData: RendererData;
  private boardSize: number;
  private colors = {
    background: "#9c8a7b",
  };

  constructor(
    gameBoardContainer: HTMLDivElement,
    cellCount: number = DEFAULT_CELL_COUNT,
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
  }

  private calculateCanvasDimensions() {
    const containerRect = this.gameBoardContainer.getBoundingClientRect();
    const smallestContainerDimension = Math.min(
      containerRect.width,
      containerRect.height,
    );

    return {
      width: smallestContainerDimension,
      height: smallestContainerDimension,
    };
  }

  private drawBoardBackground(): void {
    this.ctx.fillStyle = this.colors.background;
    this.roundRect(0, 0, this.rendererData.width, this.rendererData.height, 16);
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
