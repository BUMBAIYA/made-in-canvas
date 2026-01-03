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
      <header class="mx-auto grid w-full max-w-4xl p-5 md:grid-cols-[1fr_auto]">
        <div class="flex items-center">
          <h1 class="text-4xl font-bold">2048</h1>
        </div>
        <div class="mt-6 flex items-center justify-center space-x-4 md:mt-0 md:justify-normal">
          <div class="bg-hover text-background flex min-w-24 flex-col rounded-xl px-4 py-1.5 text-center">
            <span class="text-accent text-xs font-semibold capitalize">
              SCORE
            </span>
            <span class="text-accent text-xl font-bold">
              {gameUIState().score}
            </span>
          </div>
          <button
            class="bg-accent text-background focus:ring-accent w-fit cursor-pointer rounded-lg px-4 py-1.5 ring-2 transition-all hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-offset-2"
            onClick={handleStartNewGame}
          >
            <span class="font-medium">New Game</span>
          </button>
        </div>
      </header>

      {gameUIState().gameState !== "playing" && (
        <div class="flex items-center justify-center">
          <div class="bg-hover text-background flex min-w-28 animate-bounce flex-col rounded-xl px-5 py-1 text-center">
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
