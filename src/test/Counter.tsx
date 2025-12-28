import { createSignal } from "solid-js";
import { CounterButton, CounterRenderer } from "@/test/index";

/**
 * SolidJs Counter Component for testing eslint rules, prettier rules and husky rules
 *
 * */
export function Counter() {
  const [count, setCount] = createSignal(0);

  const handleUpdateCount = (_offset: number) => {
    setCount((prev) => prev + _offset);
  };

  return (
    <div class="flex flex-col space-y-2 rounded border p-4">
      <span>SolidJs Counter Component</span>
      <div class="flex items-center space-x-6">
        <CounterButton
          text="Subtract -"
          offset={-1}
          handleUpdateCount={handleUpdateCount}
        />
        <CounterRenderer count={count} />
        <CounterButton
          text="Add +"
          offset={1}
          handleUpdateCount={handleUpdateCount}
        />
      </div>
    </div>
  );
}
