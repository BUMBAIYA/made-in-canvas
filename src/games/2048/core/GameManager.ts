import { InputManager, type InputEvent } from "@/games/2048/core/InputManager";
import { CanvasRenderer } from "@/games/2048/core/CanvasRenderer";
import { GameLogicManager } from "@/games/2048/core/GameLogicManager";
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
  private gameConfig: GameConfigType;
  private resizeDebounceTimer: number = -1;
  private uiStateListeners: ((event: GameStateType) => void)[] = [];

  constructor(gameBoardContainer: HTMLDivElement, gameConfig?: GameConfigType) {
    this.gameConfig = { ...DEFAULT_CONFIG, ...gameConfig };
    this.gameBoardContainer = gameBoardContainer;
    this.inputManager = new InputManager();
    this.canvasRenderer = new CanvasRenderer(
      this.gameBoardContainer,
      this.gameConfig.size,
    );
    this.gameLogic = new GameLogicManager(this.gameConfig);

    // Connect animation system
    this.gameLogic.setAnimationManager(
      this.canvasRenderer.getAnimationManager(),
    );

    this.canvasRenderer.startRenderLoop(
      this.gameLogic.getGameLogicState().grid,
    );
    this.setupEventListeners();
    this.start();
  }

  public start(): void {
    this.gameLogic.start();
    this.canvasRenderer.startRenderLoop(
      this.gameLogic.getGameLogicState().grid,
    );
    this.notifyUIStateListener();
  }

  public reset(): void {
    this.gameLogic.reset();
    this.canvasRenderer.startRenderLoop(
      this.gameLogic.getGameLogicState().grid,
    );
    this.notifyUIStateListener();
  }

  public cleanup(): void {
    this.inputManager.cleanup();
    this.canvasRenderer.cleanup();
    window.removeEventListener("resize", this.handleWindowResize.bind(this));
  }

  public attachGameUIStateListener(listener: (event: GameStateType) => void) {
    this.uiStateListeners.push(listener);
  }

  private notifyUIStateListener() {
    this.uiStateListeners.forEach((listener) => {
      listener(this.gameLogic.getGameLogicState());
    });
  }

  private handleWindowResize(): void {
    window.clearTimeout(this.resizeDebounceTimer);
    this.resizeDebounceTimer = window.setTimeout(() => {
      this.canvasRenderer.onWindowResize(
        this.gameLogic.getGameLogicState().grid,
      );
    }, 100);
  }

  private setupEventListeners(): void {
    this.inputManager.addListener(this.handleInput.bind(this));
    window.addEventListener("resize", this.handleWindowResize.bind(this));
  }

  private handleInput(event: InputEvent): void {
    const { currentGameState } = this.gameLogic.getGameLogicState();
    console.log("Input Event:", event, currentGameState);
    if (currentGameState !== "playing") return;

    const moved = this.gameLogic.move(event.direction);
    if (moved) {
      this.canvasRenderer.startRenderLoop(
        this.gameLogic.getGameLogicState().grid,
      );
      this.notifyUIStateListener();
    }
  }
}
