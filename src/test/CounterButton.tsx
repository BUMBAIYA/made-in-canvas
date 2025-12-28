export interface CounterButtonProps {
  text: string;
  offset: number;
  handleUpdateCount: (offset: number) => void;
}

export function CounterButton(props: CounterButtonProps) {
  return (
    <button
      onClick={() => props.handleUpdateCount(props.offset)}
      class="flex cursor-pointer items-center rounded border px-3 py-1 hover:bg-gray-100"
    >
      <span>{props.text}</span>
    </button>
  );
}
