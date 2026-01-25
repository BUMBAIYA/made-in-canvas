import { createSignal, onCleanup, onMount } from "solid-js";
import { GameManager } from "@/games/2048/core/GameManager";
import { useSwipeable, type SwipeDirections } from "@/hooks/useSwipeable";
import type { GameStateType } from "@/games/2048/core/types";
import type { Direction } from "@/games/2048/core/InputManager";

type GameUISate = {
  score: number;
  gameState: GameStateType["currentGameState"];
  movesCount: number;
};

const SwipeDirectionToGameDirectionMap: Record<SwipeDirections, Direction> = {
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
  Up: "UP",
};

export function GamePage() {
  let gameBoardContainer!: HTMLDivElement;
  let gameManager: GameManager;

  const [gameUIState, setGameUIState] = createSignal<GameUISate>({
    gameState: "playing",
    score: 0,
    movesCount: 0,
  });

  const { ref: swipeableRef } = useSwipeable({
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackMouse: true,
    onSwiped: (event) => {
      if (gameManager) {
        gameManager.handleInput({
          timestamp: Date.now(),
          direction: SwipeDirectionToGameDirectionMap[event.dir],
        });
      }
    },
  });

  onMount(() => {
    const uiUpdateHandler = (state: GameStateType) => {
      setGameUIState({
        score: state.score,
        gameState: state.currentGameState,
        movesCount: state.movesCount,
      });
    };
    gameManager = new GameManager(gameBoardContainer);

    gameManager.attachGameUIStateListener(uiUpdateHandler);

    onCleanup(() => {
      gameManager.cleanup();
    });
  });

  const isGameOver = () => {
    return (
      gameUIState().gameState === "game-over" ||
      gameUIState().gameState === "won"
    );
  };

  const handleStartNewGame = () => {
    gameManager.reset();
  };

  return (
    <>
      <header class="relative mx-auto min-h-36 w-full max-w-4xl md:min-h-28">
        <div
          data-gameover={isGameOver()}
          class="absolute inset-x-0 flex translate-y-[-100%] transform-gpu flex-col items-center justify-center p-4 opacity-0 duration-200 will-change-[opacity] data-[gameover=true]:top-1/2 data-[gameover=true]:-translate-y-1/2 data-[gameover=true]:opacity-100"
        >
          <span class="text-accent text-5xl font-bold md:text-4xl">
            {gameUIState().gameState === "game-over" ? "Game Over" : "You Won"}
          </span>
          <p class="text-accent">
            <span class="font-bold">{gameUIState().score}</span> points scored
            in <span class="font-bold">{gameUIState().movesCount}</span> moves
          </p>
        </div>
        <div
          data-gameover={isGameOver()}
          class="absolute inset-x-0 grid w-full transform-gpu p-4 duration-200 data-[gameover=true]:translate-y-[-100%] data-[gameover=true]:opacity-0 md:grid-cols-[1fr_auto]"
        >
          <div class="flex items-center">
            <h1 class="text-4xl font-bold">2048</h1>
          </div>
          <div class="mt-3 flex items-center justify-center space-x-4 md:mt-0 md:justify-normal">
            <div class="bg-hover text-background flex min-w-24 flex-col rounded-xl px-4 py-1.5 text-center">
              <span class="text-accent text-xs font-semibold capitalize">
                SCORE
              </span>
              <span class="text-accent text-xl font-bold">
                {gameUIState().score}
              </span>
            </div>
            <button
              class="bg-accent text-background focus:ring-accent w-fit cursor-pointer rounded-lg px-4 py-1.5 ring-2 transition-all hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2"
              onClick={handleStartNewGame}
            >
              <span class="font-medium">New Game</span>
            </button>
          </div>
          <div />
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-4xl flex-1 flex-col p-5 md:p-0">
        <div
          ref={(el) => {
            gameBoardContainer = el;
            swipeableRef(el);
          }}
          class="flex w-full flex-1 items-center justify-center md:max-h-[450px]"
        />
        <div
          data-gameover={isGameOver()}
          class="pointer-events-none mt-8 flex h-0 w-full translate-y-[100%] transform-gpu items-center justify-center opacity-0 transition-all duration-200 data-[gameover=true]:pointer-events-auto data-[gameover=true]:h-16 data-[gameover=true]:translate-y-0 data-[gameover=true]:opacity-100"
        >
          <button
            onClick={handleStartNewGame}
            class="border-accent text-accent focus:ring-accent hover:bg-hover flex h-16 w-full max-w-[450px] transform-gpu cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-4 transition-transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2"
          >
            <span class="text-lg font-semibold">
              {gameUIState().gameState === "game-over"
                ? "Try Again"
                : "New Game"}
            </span>
          </button>
        </div>
      </main>

      <footer class="p-3">
        <p class="text-accent text-center text-xs">
          Made by{" "}
          <a target="_blank" href="https://amitchauhan.me">
            @Amit Chauhan
          </a>
        </p>
      </footer>
    </>
  );
}
