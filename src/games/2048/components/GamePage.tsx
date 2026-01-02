import { createSignal, onCleanup, onMount } from "solid-js";
import { GameManager } from "@/games/2048/GameManager";

type GameUISate = {
  score: number;
  gameState: "playing" | "won" | "lost";
};

export function GamePage() {
  let gameBoardContainer!: HTMLDivElement;
  let gameManager: GameManager;

  const [gameUIState, setGameUIState] = createSignal<GameUISate>({
    gameState: "playing",
    score: 0,
  });

  onMount(() => {
    const uiUpdateHandler = (state: GameManager["gameState"]) => {
      setGameUIState({
        score: state.score,
        gameState: state.currentGameState,
      });
    };
    gameManager = new GameManager(gameBoardContainer);
    gameManager.startNewGame();

    console.log(gameManager);

    gameManager.attachGameUIStateListener(uiUpdateHandler);

    onCleanup(() => {
      gameManager.cleanup();
    });
  });

  const handleStartNewGame = () => {
    const response = confirm(
      "Are you sure you want to start a new game?\nAll progress will be lost.",
    );
    if (response) {
      gameManager.startNewGame();
    }
  };

  return (
    <>
      <header class="mx-auto flex w-full max-w-4xl items-center justify-between p-5">
        <h1 class="text-4xl font-bold">2048</h1>
        <div class="flex items-center">
          <div class="bg-hover text-background flex min-w-28 flex-col rounded-xl px-5 py-1 text-center">
            <span class="text-accent text-sm font-medium">Score</span>
            <span class="text-accent text-2xl font-bold">
              {gameUIState().score}
            </span>
          </div>
        </div>
        <button
          class="bg-accent text-background focus:ring-accent cursor-pointer rounded-lg px-3 py-1.5 ring-2 transition-all hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-offset-2"
          onClick={handleStartNewGame}
        >
          <span class="text-xl font-medium">New Game</span>
        </button>
      </header>

      {gameUIState().gameState !== "playing" && (
        <div class="flex items-center justify-center">
          <div class="bg-hover text-background flex min-w-28 flex-col rounded-xl px-5 py-1 text-center">
            <span class="text-accent text-2xl font-bold">
              {gameUIState().gameState === "lost" ? "Game Over" : "You Won"}
            </span>
          </div>
        </div>
      )}

      <main class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-5">
        <div
          ref={gameBoardContainer}
          class="flex max-h-[450px] w-full flex-1 items-center justify-center"
        />
      </main>
    </>
  );
}
