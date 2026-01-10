import type { Direction } from "@/games/2048/core/InputManager";

export type GameConfigType = {
  size: number;
  targetScore: number;
};

export type CanvasRendererConfigType = {
  height: number;
  width: number;
  gridSize: number;
  gridGutterSize: number;
  gridCellSize: number;
};

export interface CanvasRendererColorsType {
  background: string;
  grid: string;
  tile: Record<number, string>;
  text: string;
  textLight: string;
}

export type GameGridPositionType = {
  row: number;
  col: number;
};

export type GameGridTileDataType = {
  startPosition: GameGridPositionType;
  endPosition: GameGridPositionType;
  isMerged: boolean;
  animationType: "new" | "move" | "merge" | "none";
  value: number;
  id: number;
};

export type GameGridStateType = Array<Array<GameGridTileDataType | null>>;

export type GameStateType = {
  grid: GameGridStateType;
  hasNoValidMoveInDirection: Direction | null;
  score: number;
  currentGameState: "playing" | "won" | "game-over";
  movesCount: number;
};
