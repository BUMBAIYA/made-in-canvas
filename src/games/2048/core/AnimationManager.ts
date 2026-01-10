import type {
  GameGridTileDataType,
  GameGridPositionType,
} from "@/games/2048/core/types";

export interface AnimationState {
  id: number;
  type: "appear" | "move" | "merge";
  startTime: number;
  duration: number;
  startPosition: GameGridPositionType;
  endPosition: GameGridPositionType;
  startScale: number;
  endScale: number;
  tile: GameGridTileDataType;
  isComplete: boolean;
}

export interface AnimationConfig {
  appearDuration: number;
  moveDuration: number;
  mergeDuration: number;
  easing: (t: number) => number;
}

export class AnimationManager {
  private animations: Map<number, AnimationState> = new Map();
  private config: AnimationConfig;
  private currentTime: number = 0;

  constructor(config?: Partial<AnimationConfig>) {
    this.config = {
      appearDuration: 200,
      moveDuration: 150,
      mergeDuration: 200,
      easing: this.easeOutCubic,
      ...config,
    };
  }

  public addAppearAnimation(tile: GameGridTileDataType): void {
    const animation: AnimationState = {
      id: tile.id,
      type: "appear",
      startTime: this.currentTime,
      duration: this.config.appearDuration,
      startPosition: tile.startPosition,
      endPosition: tile.endPosition,
      startScale: 0,
      endScale: 1,
      tile,
      isComplete: false,
    };
    this.animations.set(tile.id, animation);
  }

  public addMoveAnimation(
    tile: GameGridTileDataType,
    fromPosition: GameGridPositionType,
    toPosition: GameGridPositionType,
  ): void {
    const animation: AnimationState = {
      id: tile.id,
      type: "move",
      startTime: this.currentTime,
      duration: this.config.moveDuration,
      startPosition: fromPosition,
      endPosition: toPosition,
      startScale: 1,
      endScale: 1,
      tile,
      isComplete: false,
    };
    this.animations.set(tile.id, animation);
  }

  public addMergeAnimation(tile: GameGridTileDataType): void {
    const animation: AnimationState = {
      id: tile.id,
      type: "merge",
      startTime: this.currentTime,
      duration: this.config.mergeDuration,
      startPosition: tile.startPosition,
      endPosition: tile.endPosition,
      startScale: 1.1,
      endScale: 1,
      tile,
      isComplete: false,
    };
    this.animations.set(tile.id, animation);
  }

  public update(deltaTime: number): void {
    this.currentTime += deltaTime;

    // Update all animations
    for (const [_id, animation] of this.animations) {
      if (animation.isComplete) continue;

      const elapsed = this.currentTime - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      const _easedProgress = this.config.easing(progress);

      if (progress >= 1) {
        animation.isComplete = true;
      }
    }

    // Remove completed animations
    for (const [_id, animation] of this.animations) {
      if (animation.isComplete) {
        this.animations.delete(animation.id);
      }
    }
  }

  public getAnimationState(tileId: number): AnimationState | null {
    return this.animations.get(tileId) || null;
  }

  public hasActiveAnimations(): boolean {
    return this.animations.size > 0;
  }

  public clearAllAnimations(): void {
    this.animations.clear();
  }

  public getCurrentPosition(tileId: number): GameGridPositionType | null {
    const animation = this.animations.get(tileId);
    if (!animation) return null;

    const elapsed = this.currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    // Use a back easing fr move animation to give it a slight overshoot feel like it have momentum
    const easedProgress =
      animation.type === "move"
        ? this.easeOutBack(progress)
        : this.config.easing(progress);

    return {
      row: this.lerp(
        animation.startPosition.row,
        animation.endPosition.row,
        easedProgress,
      ),
      col: this.lerp(
        animation.startPosition.col,
        animation.endPosition.col,
        easedProgress,
      ),
    };
  }

  public getCurrentScale(tileId: number): number {
    const animation = this.animations.get(tileId);
    if (!animation) return 1;

    const elapsed = this.currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    const easedProgress = this.config.easing(progress);

    return this.lerp(animation.startScale, animation.endScale, easedProgress);
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Back easing with slight overshoot; ends at exactly 1 when t=1
  // https://easings.net/#easeOutBack
  private easeOutBack(t: number): number {
    const c1 = 0.9; // Intensity of the overshoot. Found 0.9 to be good at the moment.
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
