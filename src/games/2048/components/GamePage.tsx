import { onCleanup, onMount } from "solid-js";
import { GameManager } from "@/games/2048/GameManager";

export function GamePage() {
  let gameBoardContainer!: HTMLDivElement;
  let gameManager: GameManager;

  onMount(() => {
    gameManager = new GameManager(gameBoardContainer);
    gameManager.render();
    gameManager.attachListeners();
    console.log(gameManager);

    onCleanup(() => {
      gameManager.cleanup();
    });
  });

  return (
    <>
      <header class="flex items-center justify-between">
        <h1 class="text-4xl font-bold">2048</h1>
      </header>
      <main class="flex flex-1 flex-col items-center justify-center p-3">
        <div ref={gameBoardContainer} class="max-h-[450px] w-full flex-1" />
      </main>
    </>
  );
}
