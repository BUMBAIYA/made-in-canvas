import { InputManager, type InputEvent } from "@/games/2048/core/InputManager";
import { CanvasRenderer } from "@/games/2048/core/CanvasRenderer";
import { GameLogicManager } from "@/games/2048/core/GameLogicManager";
import { AnimationManager } from "@/games/2048/core/AnimationManager";
import type { GameConfigType, GameStateType } from "@/games/2048/core/types";

const DEFAULT_CONFIG: GameConfigType = {
  size: 4,
  targetScore: 2048,
};

export class GameManager {
  private gameBoardContainer: HTMLDivElement;
  private inputManager: InputManager;
  private canvasRenderer: CanvasRenderer;
  private gameLogic: GameLogicManager;
  private animationManager: AnimationManager;
  private gameConfig: GameConfigType;
  private resizeDebounceTimer: number = -1;
  private uiStateListeners: ((event: GameStateType) => void)[] = [];
  private requestAnimationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  constructor(gameBoardContainer: HTMLDivElement, gameConfig?: GameConfigType) {
    this.gameConfig = { ...DEFAULT_CONFIG, ...gameConfig };
    this.gameBoardContainer = gameBoardContainer;
    this.inputManager = new InputManager();
    this.animationManager = new AnimationManager();
    this.canvasRenderer = new CanvasRenderer(
      this.gameBoardContainer,
      this.gameConfig.size,
      this.animationManager,
    );
    this.gameLogic = new GameLogicManager(this.gameConfig);

    // Connect animation system
    this.gameLogic.setAnimationManager(this.animationManager);

    this.setupEventListeners();
    this.start();
  }

  public start(): void {
    this.gameLogic.start();
    this.startRenderLoop();
    this.notifyUIStateListener();
  }

  public reset(): void {
    this.gameLogic.reset();
    this.startRenderLoop();
    this.notifyUIStateListener();
  }

  public cleanup(): void {
    this.inputManager.cleanup();
    this.stopRenderLoop();
    window.removeEventListener("resize", this.handleWindowResize.bind(this));
  }

  public attachGameUIStateListener(listener: (event: GameStateType) => void) {
    this.uiStateListeners.push(listener);
    // send game state as soon as the listener is attached
    listener(this.gameLogic.getGameLogicState());
  }

  private notifyUIStateListener() {
    const gameState = this.gameLogic.getGameLogicState();

    if (gameState.currentGameState === "game-over") {
      setTimeout(() => {
        this.gameLogic.triggerWaveAnimation();
        this.startRenderLoop();
      }, 300); // Wait for the animation to reveal the game over state
    }

    this.uiStateListeners.forEach((listener) => {
      listener(gameState);
    });
  }

  private startRenderLoop(): void {
    // Cancel existing animation loop if any
    this.stopRenderLoop();

    const animate = (currentTime: number) => {
      // Initialize lastFrameTime on first frame to avoid huge deltaTime
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }

      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Update animations
      this.animationManager.update(deltaTime);

      // Render the frame
      this.canvasRenderer.render(this.gameLogic.getGameLogicState().grid);

      // Continue the loop if there are active animations
      if (this.animationManager.hasActiveAnimations()) {
        this.requestAnimationFrameId = requestAnimationFrame(animate);
      } else {
        this.requestAnimationFrameId = null;
      }
    };

    this.lastFrameTime = 0;
    this.requestAnimationFrameId = requestAnimationFrame(animate);
  }

  private stopRenderLoop(): void {
    if (this.requestAnimationFrameId !== null) {
      cancelAnimationFrame(this.requestAnimationFrameId);
      this.requestAnimationFrameId = null;
    }
  }

  private handleWindowResize(): void {
    window.clearTimeout(this.resizeDebounceTimer);
    this.resizeDebounceTimer = window.setTimeout(() => {
      this.canvasRenderer.handleResize();
      this.canvasRenderer.render(this.gameLogic.getGameLogicState().grid);
    }, 100);
  }

  private setupEventListeners(): void {
    this.inputManager.addListener(this.handleInput.bind(this));
    window.addEventListener("resize", this.handleWindowResize.bind(this));
  }

  private handleInput(event: InputEvent): void {
    const { currentGameState } = this.gameLogic.getGameLogicState();
    if (currentGameState !== "playing") return;

    const moved = this.gameLogic.move(event.direction);
    if (moved) {
      this.startRenderLoop();
      this.notifyUIStateListener();
    }
  }
}
