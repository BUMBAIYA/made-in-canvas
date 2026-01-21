import type {
  GameGridTileDataType,
  GameGridPositionType,
} from "@/games/2048/core/types";

export interface AnimationState {
  id: number;
  type: "appear" | "move" | "merge" | "disappear" | "wave";
  startTime: number;
  duration: number;
  startPosition: GameGridPositionType;
  endPosition: GameGridPositionType;
  startScale: number;
  endScale: number;
  startOpacity?: number;
  endOpacity?: number;
  tile: GameGridTileDataType;
  isComplete: boolean;
}

export interface AnimationConfig {
  appearDuration: number;
  moveDuration: number;
  mergeDuration: number;
  disappearDuration: number;
  waveDuration: number;
  easing: (t: number) => number;
}

export class AnimationManager {
  private animationQueues: Map<number, AnimationState[]> = new Map();
  private config: AnimationConfig;
  private currentTime: number = 0;

  constructor(config?: Partial<AnimationConfig>) {
    this.config = {
      appearDuration: 200,
      moveDuration: 150,
      mergeDuration: 200,
      disappearDuration: 150,
      waveDuration: 300,
      easing: this.easeOutCubic,
      ...config,
    };
  }

  public addAppearAnimation(
    tile: GameGridTileDataType,
    config?: Partial<{ delay: number }>,
  ): void {
    // Many cool animations can be added using this delay parameter.
    // Refeer `GameLogicManager.ts` for examples.
    const { delay = 0 } = config || {};
    const animation: AnimationState = {
      id: tile.id,
      type: "appear",
      startTime: this.currentTime + delay,
      duration: this.config.appearDuration,
      startPosition: tile.startPosition,
      endPosition: tile.endPosition,
      startScale: 0,
      endScale: 1,
      tile,
      isComplete: false,
    };
    this.queueAnimation(tile.id, animation);
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
    this.queueAnimation(tile.id, animation);
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
    this.queueAnimation(tile.id, animation);
  }

  public addDelayedMergeAnimation(
    tile: GameGridTileDataType,
    position: GameGridPositionType,
    delay: number,
  ): void {
    const animation: AnimationState = {
      id: tile.id,
      type: "merge",
      startTime: this.currentTime + delay,
      duration: this.config.mergeDuration,
      startPosition: position,
      endPosition: position,
      startScale: 1.1,
      endScale: 1,
      tile,
      isComplete: false,
    };
    this.queueAnimation(tile.id, animation);
  }

  public addDisappearAnimation(
    tile: GameGridTileDataType,
    position: GameGridPositionType,
  ): void {
    const animation: AnimationState = {
      id: tile.id,
      type: "disappear",
      startTime: this.currentTime,
      duration: this.config.disappearDuration,
      startPosition: position,
      endPosition: position,
      startScale: 1,
      endScale: 1,
      startOpacity: 1,
      endOpacity: 0,
      tile,
      isComplete: false,
    };
    this.queueAnimation(tile.id, animation);
  }

  public addWaveAnimation(
    tile: GameGridTileDataType,
    position: GameGridPositionType,
    delay: number = 0,
  ): void {
    const animation: AnimationState = {
      id: tile.id,
      type: "wave",
      startTime: this.currentTime + delay,
      duration: this.config.waveDuration,
      startPosition: position,
      endPosition: position,
      startScale: 1,
      endScale: 1.075,
      tile,
      isComplete: false,
    };
    this.queueAnimation(tile.id, animation);
  }

  /**
   * Queue an animation for a tile. If there are existing animations,
   * the new animation will start after the last animation completes.
   * However, if the animation already has a startTime set (for delayed animations),
   * we respect that time but ensure it's not before the last animation completes.
   */
  private queueAnimation(tileId: number, animation: AnimationState): void {
    const queue = this.animationQueues.get(tileId) || [];

    // If there are existing animations, calculate the start time based on the last animation
    if (queue.length > 0) {
      const lastAnimation = queue[queue.length - 1];
      const lastAnimationEndTime =
        lastAnimation.startTime + lastAnimation.duration;

      // If the animation's startTime is already set (delayed animation),
      // use the maximum of that time and when the last animation ends
      if (animation.startTime > this.currentTime) {
        animation.startTime = Math.max(
          animation.startTime,
          lastAnimationEndTime,
        );
      } else {
        // Otherwise, start after the last animation completes
        animation.startTime = lastAnimationEndTime;
      }
    }

    queue.push(animation);
    this.animationQueues.set(tileId, queue);
  }

  public getConfig(): AnimationConfig {
    return this.config;
  }

  public update(deltaTime: number): void {
    this.currentTime += deltaTime;

    // Update all animation queues
    for (const [tileId, queue] of this.animationQueues) {
      if (queue.length === 0) continue;

      // Process the first (current) animation in the queue
      const currentAnimation = queue[0];

      if (currentAnimation.isComplete) {
        // Remove completed animation and move to next in queue
        queue.shift();
        // If queue is empty, remove the tile entry
        if (queue.length === 0) {
          this.animationQueues.delete(tileId);
        }
        continue;
      }

      // Skip animations that haven't started yet (delayed animations)
      if (this.currentTime < currentAnimation.startTime) continue;

      const elapsed = this.currentTime - currentAnimation.startTime;
      const progress = Math.min(elapsed / currentAnimation.duration, 1);
      const _easedProgress = this.config.easing(progress);

      if (progress >= 1) {
        currentAnimation.isComplete = true;
      }
    }
  }

  public getAnimationState(tileId: number): AnimationState | null {
    const queue = this.animationQueues.get(tileId);
    if (!queue || queue.length === 0) return null;

    const currentAnimation = queue[0];
    return currentAnimation.isComplete ? null : currentAnimation;
  }

  public hasActiveAnimations(): boolean {
    for (const queue of this.animationQueues.values()) {
      if (queue.length > 0 && !queue[0].isComplete) {
        return true;
      }
    }
    return false;
  }

  public getAllAnimatingTiles(): GameGridTileDataType[] {
    const animatingTiles: GameGridTileDataType[] = [];
    for (const queue of this.animationQueues.values()) {
      if (queue.length > 0 && !queue[0].isComplete) {
        animatingTiles.push(queue[0].tile);
      }
    }
    return animatingTiles;
  }

  public clearAllAnimations(): void {
    this.animationQueues.clear();
  }

  public getCurrentPosition(tileId: number): GameGridPositionType | null {
    const queue = this.animationQueues.get(tileId);
    if (!queue || queue.length === 0) return null;

    const animation = queue[0];
    if (animation.isComplete) return null;

    // If animation hasn't started yet (delayed), return start position
    if (this.currentTime < animation.startTime) {
      return animation.startPosition;
    }

    const elapsed = this.currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    // Use a back easing for move animation to give it a slight overshoot feel like it have momentum
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
    const queue = this.animationQueues.get(tileId);
    if (!queue || queue.length === 0) return 1;

    const animation = queue[0];
    if (animation.isComplete) return 1;

    // If animation hasn't started yet (delayed), return start scale
    if (this.currentTime < animation.startTime) {
      return animation.startScale;
    }

    const elapsed = this.currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);

    if (animation.type === "wave") {
      // sin wave for smooth scale up and down
      const waveValue = Math.sin(progress * Math.PI);
      return this.lerp(animation.startScale, animation.endScale, waveValue);
    }

    const easedProgress = this.config.easing(progress);

    return this.lerp(animation.startScale, animation.endScale, easedProgress);
  }

  public getCurrentOpacity(tileId: number): number {
    const queue = this.animationQueues.get(tileId);
    if (!queue || queue.length === 0) return 1;

    const animation = queue[0];
    if (animation.isComplete) {
      // If animation is complete and it was a disappear, return 0
      if (animation.type === "disappear") return 0;
      return 1;
    }

    // If opacity is not defined for this animation, return 1
    if (
      animation.startOpacity === undefined ||
      animation.endOpacity === undefined
    ) {
      return 1;
    }

    // If animation hasn't started yet (delayed), return start opacity
    if (this.currentTime < animation.startTime) {
      return animation.startOpacity;
    }

    const elapsed = this.currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    const easedProgress = this.config.easing(progress);

    return this.lerp(
      animation.startOpacity,
      animation.endOpacity,
      easedProgress,
    );
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
