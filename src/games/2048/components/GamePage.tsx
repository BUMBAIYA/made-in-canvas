import { onCleanup, onMount } from "solid-js";
import { GameManager } from "@/games/2048/GameManager";

export function GamePage() {
  let gameBoardContainer!: HTMLDivElement;
  let gameManager: GameManager;

  onMount(() => {
    gameManager = new GameManager(gameBoardContainer);
    gameManager.startNewGame();

    console.log(gameManager);

    onCleanup(() => {
      gameManager.cleanup();
    });
  });

  const handleStartNewGame = () => {
    gameManager.startNewGame();
  };

  return (
    <>
      <header class="flex items-center justify-between p-5">
        <h1 class="text-4xl font-bold">2048</h1>
        <button
          class="bg-accent text-background focus:ring-accent cursor-pointer rounded-lg px-3 py-1.5 ring-2 transition-all hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-offset-2"
          onClick={handleStartNewGame}
        >
          <span class="text-xl font-medium">New Game</span>
        </button>
      </header>
      <main class="flex flex-1 flex-col items-center justify-center p-5">
        <div ref={gameBoardContainer} class="max-h-[450px] w-full flex-1" />
      </main>
    </>
  );
}
