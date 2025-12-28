import type { Accessor } from "solid-js";

export interface CounterRendererProps {
  count: Accessor<number>;
}

export function CounterRenderer(props: CounterRendererProps) {
  return <span class="text-3xl font-medium">{props.count()}</span>;
}
