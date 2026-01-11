import type {
  CanvasRendererConfigType,
  CanvasRendererColorsType,
  GameGridStateType,
  GameGridTileDataType,
} from "@/games/2048/core/types";
import {
  AnimationManager,
  type AnimationState,
} from "@/games/2048/core/AnimationManager";

/**
 * Minimum grid gutter size
 */
const MIN_GRID_GUTTER_SIZE = 8;
/**
 * Base percentage for 4x4 grid
 */
const BASE_GUTTER_SIZE_PERCENTAGE = 2.5;

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rendererConfig: CanvasRendererConfigType;
  private colors: CanvasRendererColorsType;
  private gameBoardContainer: HTMLDivElement;
  private boardGridSize: number;
  private requestAnimationFrameId: number | null;
  private animationManager: AnimationManager;
  private lastFrameTime: number = 0;

  constructor(gameBoardContainer: HTMLDivElement, size: number) {
    this.gameBoardContainer = gameBoardContainer;
    this.boardGridSize = size;
    this.colors = this.getDefaultColors();
    this.animationManager = new AnimationManager();

    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.ctx = this.canvas.getContext("2d")!;

    this.rendererConfig = this.calculateCanvasDimension();
    this.resizeCanvas();
    this.gameBoardContainer.appendChild(this.canvas);
    this.requestAnimationFrameId = null;
  }

  public render(gameLogicState: GameGridStateType) {
    this.drawBoardBackground();
    this.drawBoardBackgroundGrid();
    this.drawTiles(gameLogicState);
  }

  public getAnimationManager(): AnimationManager {
    return this.animationManager;
  }

  public startRenderLoop(gameLogicState: GameGridStateType): void {
    // Cancel existing animation loop if any
    if (this.requestAnimationFrameId !== null) {
      cancelAnimationFrame(this.requestAnimationFrameId);
    }

    const animate = (currentTime: number) => {
      console.log("animate");
      // Initialize lastFrameTime on first frame to avoid huge deltaTime
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }

      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Update animations
      this.animationManager.update(deltaTime);

      // Render the frame
      this.render(gameLogicState);

      // Continue the loop if there are active animations
      if (this.animationManager.hasActiveAnimations()) {
        this.requestAnimationFrameId = requestAnimationFrame(animate);
      } else {
        this.requestAnimationFrameId = null;
      }
    };

    console.log("startRenderLoop");

    this.lastFrameTime = 0;
    this.requestAnimationFrameId = requestAnimationFrame(animate);
  }

  public getRendererConfig(): CanvasRendererConfigType {
    return this.rendererConfig;
  }

  public cleanup(): void {
    if (this.requestAnimationFrameId) {
      cancelAnimationFrame(this.requestAnimationFrameId);
    }
  }

  public onWindowResize(gameLogicState: GameGridStateType): void {
    this.rendererConfig = this.calculateCanvasDimension();

    if (
      this.rendererConfig.width === this.canvas.width &&
      this.rendererConfig.height === this.canvas.height
    ) {
      return;
    }

    this.resizeCanvas();
    this.render(gameLogicState);
  }

  private drawTiles(gameLogicState: GameGridStateType): void {
    // Track which tiles are in the grid to avoid double rendering
    const gridTileIds = new Set<number>();
    for (let row = 0; row < gameLogicState.length; row++) {
      for (let col = 0; col < gameLogicState[row].length; col++) {
        const tile = gameLogicState[row][col];
        if (tile) {
          gridTileIds.add(tile.id);
        }
      }
    }

    // First pass: draw tiles that are not animating
    for (let row = 0; row < gameLogicState.length; row++) {
      for (let col = 0; col < gameLogicState[row].length; col++) {
        const tile = gameLogicState[row][col];
        if (tile && !this.animationManager.getAnimationState(tile.id)) {
          this.drawTile(row, col, tile.value);
        }
      }
    }

    // Second pass: draw animating tiles (including those removed from grid)
    const animatingTiles = this.animationManager.getAllAnimatingTiles();
    for (const tile of animatingTiles) {
      const animationState = this.animationManager.getAnimationState(tile.id);
      if (animationState) {
        this.drawAnimatedTile(tile, animationState);
      }
    }
  }

  private calculateCanvasDimension(): CanvasRendererConfigType {
    const containerRect = this.gameBoardContainer.getBoundingClientRect();
    const maxAvailableSize = Math.min(
      containerRect.width,
      containerRect.height,
    );

    const cellCount = this.boardGridSize;

    // Our multipler factor is 4 / cellcount as we use percentage for 4x4 grid.
    const gutterPercentage = BASE_GUTTER_SIZE_PERCENTAGE * (4 / cellCount);

    const gutter = Math.max(
      Math.floor((maxAvailableSize / 100) * gutterPercentage),
      MIN_GRID_GUTTER_SIZE,
    );
    const cellSize = Math.floor(
      (maxAvailableSize - gutter * (cellCount + 1)) / cellCount,
    );

    const size = cellSize * cellCount + gutter * (cellCount + 1);

    return {
      height: size,
      width: size,
      gridSize: cellCount,
      gridGutterSize: gutter,
      gridCellSize: cellSize,
    };
  }

  private resizeCanvas(): void {
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#correcting_resolution_in_a_canvas
    // We need set actual canvas size in memory and then scale down using css to maintain pixel perfect rendering
    // to account for high resolution retina displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.rendererConfig.width * dpr;
    this.canvas.height = this.rendererConfig.height * dpr;
    this.canvas.style.width = `${this.rendererConfig.width}px`;
    this.canvas.style.height = `${this.rendererConfig.height}px`;
    this.ctx.scale(dpr, dpr); // Normalize coordinate system to use CSS pixels.
  }

  private drawBoardBackgroundGrid(): void {
    this.ctx.fillStyle = this.colors.grid;

    const cellSize = this.rendererConfig.gridCellSize;
    const padding = this.rendererConfig.gridGutterSize;
    const gridSize = this.rendererConfig.gridSize;

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
      this.rendererConfig.width,
      this.rendererConfig.height,
      this.rendererConfig.gridGutterSize * 1.75,
    );
  }

  public drawTile(row: number, col: number, value: number): void {
    const padding = this.rendererConfig.gridGutterSize;
    const cellSize = this.rendererConfig.gridCellSize;

    const x = padding + col * cellSize + col * padding;
    const y = padding + row * cellSize + row * padding;
    const tileColor = this.colors.tile[value] || this.colors.tile[65536];
    this.ctx.fillStyle = tileColor;

    this.roundRect(x, y, cellSize, cellSize, padding);
    this.drawTileText(value, x, y, cellSize);
  }

  private drawAnimatedTile(
    tile: GameGridTileDataType,
    _animationState: AnimationState,
  ): void {
    const padding = this.rendererConfig.gridGutterSize;
    const cellSize = this.rendererConfig.gridCellSize;

    // Get current animation position
    const currentPosition = this.animationManager.getCurrentPosition(tile.id);
    const currentScale = this.animationManager.getCurrentScale(tile.id);

    if (!currentPosition) return;

    // Calculate position with animation interpolation
    const x =
      padding + currentPosition.col * cellSize + currentPosition.col * padding;
    const y =
      padding + currentPosition.row * cellSize + currentPosition.row * padding;

    // Apply scaling
    const scaledCellSize = cellSize * currentScale;
    const scaledPadding = padding * currentScale;

    // Center the scaled tile
    const offsetX = (cellSize - scaledCellSize) / 2;
    const offsetY = (cellSize - scaledCellSize) / 2;

    const tileColor = this.colors.tile[tile.value] || this.colors.tile[0];
    this.ctx.fillStyle = tileColor;

    this.roundRect(
      x + offsetX,
      y + offsetY,
      scaledCellSize,
      scaledCellSize,
      scaledPadding,
    );
    this.drawTileText(tile.value, x + offsetX, y + offsetY, scaledCellSize);
  }

  private drawTileText(
    value: number,
    x: number,
    y: number,
    cellSize: number,
  ): void {
    const text = value.toString();
    const fontSize = this.getFontSize(value, cellSize);

    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "alphabetic";

    this.ctx.fillStyle = value <= 4 ? this.colors.text : this.colors.textLight;

    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2 + fontSize * 0.38;

    this.ctx.fillText(text, centerX, centerY);
  }

  private getFontSize(value: number, cellSize: number): number {
    const baseSize = cellSize * 0.425;

    if (value < 100) return baseSize;
    if (value < 1000) return baseSize * 0.8;
    if (value < 10000) return baseSize * 0.7;
    return baseSize * 0.7;
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

  private getDefaultColors(): CanvasRendererColorsType {
    return {
      background: "#9c8a7b",
      grid: "#bdac97",
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
  }
}
