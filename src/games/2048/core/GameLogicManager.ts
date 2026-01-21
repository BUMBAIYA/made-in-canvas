import type {
  GameConfigType,
  GameGridPositionType,
  GameGridTileDataType,
  GameStateType,
} from "@/games/2048/core/types";
import type { InputEvent } from "@/games/2048/core/InputManager";
import type { AnimationManager } from "@/games/2048/core/AnimationManager";

const DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 }, // right
];

export class GameLogicManager {
  private gameLogicState: GameStateType;
  private config: GameConfigType;
  private animationManager: AnimationManager | null = null;
  private saveDebounceTimer: number = -1;
  private readonly SAVE_DEBOUNCE_DELAY = 300; // 300ms debounce delay

  constructor(config: GameConfigType) {
    this.config = config;
    this.gameLogicState = this.initGameLogicState();
  }

  public setAnimationManager(animationManager: AnimationManager): void {
    this.animationManager = animationManager;
  }

  public start(): void {
    const loaded = this.loadGameState();
    if (!loaded) {
      this.addRandomTile();
      this.addRandomTile();
    }
    // Added appear animations in case the game is loaded from a saved state
    // This show the tiles appears from one by one from the bottom-left to the top-right. eg: (this.config.size - rowIndex - 1) * this.config.size + colIndex) * 30
    // If I want to show the tiles appearing from the left to the right then delay should be based on the column index. eg: (colIndex * 30)
    // If I want to show the tiles appearing from the bottom to the top then delay should be based on the row index. eg: (rowIndex * 30)
    // This is top-left to bottom-right. eg: (rowIndex * this.config.size + colIndex) * 30
    this.gameLogicState.grid.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile && this.animationManager) {
          this.animationManager.addAppearAnimation(tile, {
            delay: (rowIndex * this.config.size + colIndex) * 30,
          });
        }
      });
    });
    this.gameLogicState.hasNoValidMoveInDirection = null;
    this.saveGameState(true);
  }

  public reset(): void {
    this.gameLogicState = this.initGameLogicState();
    this.addRandomTile();
    this.addRandomTile();
    this.gameLogicState.hasNoValidMoveInDirection = null;
    this.clearSavedGameState();
  }

  public getGameLogicState(): GameStateType {
    return this.gameLogicState;
  }

  public saveGameState(immediate: boolean = false): void {
    if (this.saveDebounceTimer !== -1) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = -1;
    }

    const performSave = () => {
      try {
        const saveData = {
          score: this.gameLogicState.score,
          movesCount: this.gameLogicState.movesCount,
          currentGameState: this.gameLogicState.currentGameState,
          grid: this.gameLogicState.grid.map((row) =>
            row.map((tile) => (tile ? tile.value : null)),
          ),
        };
        localStorage.setItem("2048_game_state", JSON.stringify(saveData));
      } catch (error) {
        console.error("Failed to save game state:", error);
      }
    };

    if (immediate) {
      performSave();
    } else {
      this.saveDebounceTimer = window.setTimeout(
        performSave,
        this.SAVE_DEBOUNCE_DELAY,
      );
    }
  }

  public loadGameState(): boolean {
    try {
      const savedData = localStorage.getItem("2048_game_state");
      if (!savedData) return false;

      const data = JSON.parse(savedData);

      // Validte data
      if (
        !data.grid ||
        !Array.isArray(data.grid) ||
        typeof data.score !== "number" ||
        typeof data.movesCount !== "number"
      ) {
        return false;
      }

      // collect tile data
      const grid: GameGridTileDataType[][] = data.grid.map(
        (row: (number | null)[], rowIndex: number) =>
          row.map((value: number | null, colIndex: number) => {
            if (value === null) return null;

            const position = { row: rowIndex, col: colIndex };
            return {
              value,
              startPosition: position,
              endPosition: position,
              isMerged: false,
              animationType: "none" as const,
              id: Math.random() * 1000000, // Generate new ID
            };
          }),
      );

      // Restore game state
      this.gameLogicState = {
        grid,
        score: data.score,
        movesCount: data.movesCount,
        currentGameState: data.currentGameState || "playing",
        hasNoValidMoveInDirection: null,
      };

      return true;
    } catch (error) {
      console.error("Failed to load game state:", error);
      return false;
    }
  }

  public clearSavedGameState(): void {
    try {
      localStorage.removeItem("2048_game_state");
    } catch (error) {
      console.error("Failed to clear saved game state:", error);
    }
  }

  public triggerWaveAnimation(): void {
    if (!this.animationManager) return;

    const delayPerTile = 30;

    this.animationManager.clearAllAnimations();

    for (let row = 0; row < this.gameLogicState.grid.length; row++) {
      for (let col = 0; col < this.gameLogicState.grid[row].length; col++) {
        const tile = this.gameLogicState.grid[row][col];
        if (tile) {
          // Calculate delay based on distance from top-left
          // Tiles closer to top-left start earlier
          const distance = row + col;
          const delay = distance * delayPerTile;

          this.animationManager.addWaveAnimation(tile, { row, col }, delay);
        }
      }
    }
  }

  public move(direction: InputEvent["direction"]): boolean {
    if (this.gameLogicState.hasNoValidMoveInDirection === direction)
      return false;
    if (this.gameLogicState.currentGameState !== "playing") return false;

    let moved = false;

    this.clearMergedFlags();

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
      this.gameLogicState.movesCount++;
      this.addRandomTile();
      this.checkGameState();
      // Reset the hasNoValidMoveInDirection flag
      this.gameLogicState.hasNoValidMoveInDirection = null;
      this.saveGameState();
    }

    // Set the hasNoValidMoveInDirection flag to the current direction so that the input manager can block input in that direction for the next moves in same direction until the player moves in a different direction.
    if (!moved) {
      this.gameLogicState.hasNoValidMoveInDirection = direction;
    }

    return moved;
  }

  private initGameLogicState(): GameStateType {
    const grid = Array(this.config.size)
      .fill(null)
      .map(() => Array(this.config.size).fill(null));

    return {
      grid: grid,
      score: 0,
      currentGameState: "playing",
      movesCount: 0,
      hasNoValidMoveInDirection: null,
    };
  }

  private moveUp(): boolean {
    let moved = false;
    for (let col = 0; col < this.config.size; col++) {
      const column = this.getColumn(col);
      const newColumn = this.mergeTiles(column);
      if (this.arraysEqual(column, newColumn)) continue;

      moved = true;
      this.setColumnWithAnimation(col, column, newColumn);
    }
    return moved;
  }

  private moveDown(): boolean {
    let moved = false;
    for (let col = 0; col < this.config.size; col++) {
      const column = this.getColumn(col).reverse();
      const newColumn = this.mergeTiles(column).reverse();
      if (this.arraysEqual(this.getColumn(col), newColumn)) continue;

      moved = true;
      this.setColumnWithAnimation(col, this.getColumn(col), newColumn);
    }
    return moved;
  }

  private moveLeft(): boolean {
    let moved = false;
    for (let row = 0; row < this.config.size; row++) {
      const rowTiles = this.getRow(row);
      const newRow = this.mergeTiles(rowTiles);
      if (this.arraysEqual(rowTiles, newRow)) continue;

      moved = true;
      this.setRowWithAnimation(row, rowTiles, newRow);
    }
    return moved;
  }

  private moveRight(): boolean {
    let moved = false;
    for (let row = 0; row < this.config.size; row++) {
      const rowTiles = this.getRow(row).reverse();
      const newRow = this.mergeTiles(rowTiles).reverse();
      if (this.arraysEqual(this.getRow(row), newRow)) continue;

      moved = true;
      this.setRowWithAnimation(row, this.getRow(row), newRow);
    }
    return moved;
  }

  private mergeTiles(
    tiles: (GameGridTileDataType | null)[],
  ): (GameGridTileDataType | null)[] {
    const filtered = tiles.filter((tile) => tile !== null);
    const merged: (GameGridTileDataType | null)[] = [];
    let i = 0;

    while (i < filtered.length) {
      if (
        i < filtered.length - 1 &&
        filtered[i].value === filtered[i + 1].value
      ) {
        // Merge tiles
        const mergedTile: GameGridTileDataType = {
          value: filtered[i].value * 2,
          startPosition: filtered[i].startPosition,
          endPosition: filtered[i].endPosition,
          isMerged: true,
          animationType: "merge",
          id: filtered[i + 1].id, // Keep the right tile's ID so we can track it and it's the tile that wil be removed from the grid
        };
        merged.push(mergedTile);
        this.gameLogicState.score += mergedTile.value;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }

    while (merged.length < this.config.size) {
      merged.push(null);
    }

    return merged;
  }

  private getColumn(col: number): (GameGridTileDataType | null)[] {
    return this.gameLogicState.grid.map((row) => row[col]);
  }

  private setColumn(col: number, tiles: (GameGridTileDataType | null)[]): void {
    tiles.forEach((tile, row) => {
      if (tile) {
        tile.startPosition = { row: row, col: col };
        tile.endPosition = { row: row, col: col };
      }
      this.gameLogicState.grid[row][col] = tile;
    });
  }

  private getRow(row: number): (GameGridTileDataType | null)[] {
    return [...this.gameLogicState.grid[row]];
  }

  private setRow(row: number, tiles: (GameGridTileDataType | null)[]): void {
    tiles.forEach((tile, col) => {
      if (tile) {
        tile.startPosition = { row: row, col: col };
        tile.endPosition = { row: row, col: col };
      }
      this.gameLogicState.grid[row][col] = tile;
    });
  }

  /**
   * Common logic for processing tiles with animations (used by both row and column operations)
   */
  private processTilesWithAnimation(
    newTiles: (GameGridTileDataType | null)[],
    oldTilePositions: Map<number, GameGridPositionType>,
    oldTileMap: Map<number, GameGridTileDataType>,
    getFinalPosition: (index: number) => GameGridPositionType,
    isLeftTile: (
      leftPos: GameGridPositionType,
      rightPos: GameGridPositionType,
    ) => boolean,
    setTileInGrid: (
      row: number,
      col: number,
      tile: GameGridTileDataType | null,
    ) => void,
  ): void {
    newTiles.forEach((tile, index) => {
      const finalPosition = getFinalPosition(index);
      if (tile) {
        // Get the actual old position from our map
        const oldPosition = oldTilePositions.get(tile.id);
        if (oldPosition) {
          // Tile moved - add move animation
          tile.startPosition = oldPosition;
          tile.endPosition = finalPosition;
          if (this.animationManager) {
            this.animationManager.addMoveAnimation(
              tile,
              oldPosition,
              tile.endPosition,
            );
          }
        } else if (tile.isMerged) {
          // Tile merged - need to find both tiles that merged
          // The merged tile keeps the right tile's ID
          const mergedValue = tile.value;
          const halfValue = mergedValue / 2;

          // Find the right tile (the one that kept its ID)
          // The merged tile has the same ID as the right tile, but double the value
          const rightTile = oldTileMap.get(tile.id);

          // Verify it's the right tile by checking it has half the value
          if (!rightTile || rightTile.value !== halfValue) {
            // Fallback: if we can't find the right tile, just do merge animation
            tile.startPosition = finalPosition;
            tile.endPosition = finalPosition;
            if (this.animationManager) {
              this.animationManager.addMergeAnimation(tile);
            }
            setTileInGrid(finalPosition.row, finalPosition.col, tile);
            return;
          }

          // Find the left tile (the one that was removed - same value, different ID)
          let leftTile: GameGridTileDataType | null = null;
          if (rightTile) {
            const rightOldPosition = oldTilePositions.get(rightTile.id)!;
            for (const [tileId, oldTile] of oldTileMap) {
              if (tileId !== tile.id && oldTile.value === halfValue) {
                const leftOldPosition = oldTilePositions.get(tileId)!;
                // Check if this tile is to the left/above of the right tile
                if (isLeftTile(leftOldPosition, rightOldPosition)) {
                  leftTile = oldTile;
                  break;
                }
              }
            }
          }

          if (leftTile && rightTile && this.animationManager) {
            const leftOldPosition = oldTilePositions.get(leftTile.id)!;
            const rightOldPosition = oldTilePositions.get(rightTile.id)!;

            // Step 1: Animate both tiles moving to the final position
            this.animationManager.addMoveAnimation(
              leftTile,
              leftOldPosition,
              finalPosition,
            );
            this.animationManager.addMoveAnimation(
              rightTile,
              rightOldPosition,
              finalPosition,
            );

            // Step 2: Queue disappear animations for both tiles after move completes
            this.animationManager.addDisappearAnimation(
              leftTile,
              finalPosition,
            );
            this.animationManager.addDisappearAnimation(
              rightTile,
              finalPosition,
            );

            // Step 3: Queue appear animation for merged tile after disappears complete
            tile.startPosition = finalPosition;
            tile.endPosition = finalPosition;
            this.animationManager.addAppearAnimation(tile);
          } else {
            // Fallback: if we can't find both tiles, just do merge animation
            tile.startPosition = finalPosition;
            tile.endPosition = finalPosition;
            if (this.animationManager) {
              this.animationManager.addMergeAnimation(tile);
            }
          }
        } else {
          // New tile - add appear animation
          tile.startPosition = finalPosition;
          tile.endPosition = finalPosition;
          if (this.animationManager) {
            this.animationManager.addAppearAnimation(tile);
          }
        }
      }
      setTileInGrid(finalPosition.row, finalPosition.col, tile);
    });
  }

  private setColumnWithAnimation(
    col: number,
    oldColumn: (GameGridTileDataType | null)[],
    newColumn: (GameGridTileDataType | null)[],
  ): void {
    // Map tiles to their actual positions in the old column
    const oldTilePositions = new Map<number, GameGridPositionType>();
    const oldTileMap = new Map<number, GameGridTileDataType>();
    oldColumn.forEach((oldTile, oldRow) => {
      if (oldTile) {
        oldTilePositions.set(oldTile.id, { row: oldRow, col: col });
        oldTileMap.set(oldTile.id, oldTile);
      }
    });

    this.processTilesWithAnimation(
      newColumn,
      oldTilePositions,
      oldTileMap,
      (index) => ({ row: index, col: col }),
      (leftPos, rightPos) => leftPos.row < rightPos.row, // For vertical: above is "left"
      (row, col, tile) => {
        this.gameLogicState.grid[row][col] = tile;
      },
    );
  }

  private setRowWithAnimation(
    row: number,
    oldRow: (GameGridTileDataType | null)[],
    newRow: (GameGridTileDataType | null)[],
  ): void {
    // Map tiles to their actual positions in the old row
    const oldTilePositions = new Map<number, GameGridPositionType>();
    const oldTileMap = new Map<number, GameGridTileDataType>();
    oldRow.forEach((oldTile, oldCol) => {
      if (oldTile) {
        oldTilePositions.set(oldTile.id, { row: row, col: oldCol });
        oldTileMap.set(oldTile.id, oldTile);
      }
    });

    this.processTilesWithAnimation(
      newRow,
      oldTilePositions,
      oldTileMap,
      (index) => ({ row: row, col: index }),
      (leftPos, rightPos) => leftPos.col < rightPos.col, // For horizontal: left is "left"
      (row, col, tile) => {
        this.gameLogicState.grid[row][col] = tile;
      },
    );
  }

  private arraysEqual(
    a: (GameGridTileDataType | null)[],
    b: (GameGridTileDataType | null)[],
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.value !== b[i]?.value) return false;
    }
    return true;
  }

  private clearMergedFlags(): void {
    this.gameLogicState.grid.forEach((row) => {
      row.forEach((tile) => {
        if (tile) tile.isMerged = false;
      });
    });
  }

  private checkGameState(): void {
    if (
      this.gameLogicState.currentGameState !== "won" &&
      this.hasWinningTile()
    ) {
      this.gameLogicState.currentGameState = "won";
    }

    if (this.isGameOver()) {
      this.gameLogicState.currentGameState = "game-over";
    }
  }

  private hasWinningTile(): boolean {
    return this.gameLogicState.grid.some((row) =>
      row.some((tile) => tile && tile.value >= this.config.targetScore),
    );
  }

  private isGameOver(): boolean {
    for (let y = 0; y < this.config.size; y++) {
      for (let x = 0; x < this.config.size; x++) {
        if (this.gameLogicState.grid[y][x] === null) {
          return false;
        }
      }
    }

    for (let y = 0; y < this.config.size; y++) {
      for (let x = 0; x < this.config.size; x++) {
        const current = this.gameLogicState.grid[y][x];
        if (!current) continue;

        for (const dir of DIRECTIONS) {
          const newX = x + dir.x;
          const newY = y + dir.y;

          if (
            newX >= 0 &&
            newX < this.config.size &&
            newY >= 0 &&
            newY < this.config.size
          ) {
            const adjacent = this.gameLogicState.grid[newY][newX];
            if (!adjacent || adjacent.value === current.value) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  private addRandomTile(): void {
    const emptyCells: GameGridPositionType[] = [];

    for (let y = 0; y < this.config.size; y++) {
      for (let x = 0; x < this.config.size; x++) {
        if (this.gameLogicState.grid[y][x] === null) {
          emptyCells.push({ row: y, col: x });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell =
        emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;

      const newTile: GameGridTileDataType = {
        value,
        startPosition: randomCell,
        endPosition: randomCell,
        isMerged: false,
        animationType: "new",
        id: Math.random() * 1000000,
      };

      this.gameLogicState.grid[randomCell.row][randomCell.col] = newTile;

      // Add appear animation
      if (this.animationManager) {
        this.animationManager.addAppearAnimation(newTile);
      }
    }
  }
}
