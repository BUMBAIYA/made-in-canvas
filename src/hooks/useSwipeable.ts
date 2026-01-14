// This is straight ported from the original react-swipeable library.
// Source: https://github.com/FormidableLabs/react-swipeable/blob/main/src/index.ts

import { createSignal, createEffect, onCleanup } from "solid-js";

const LEFT = "Left";
const RIGHT = "Right";
const UP = "Up";
const DOWN = "Down";
type HandledEvents = TouchEvent | MouseEvent;
export type SwipeDirections =
  | typeof LEFT
  | typeof RIGHT
  | typeof UP
  | typeof DOWN;
export interface SwipeEventData {
  absX: number;
  absY: number;
  deltaX: number;
  deltaY: number;
  dir: SwipeDirections;
  event: HandledEvents;
  first: boolean;
  initial: Vector2;
  velocity: number;
  vxvy: Vector2;
}

export type SwipeCallback = (eventData: SwipeEventData) => void;
export type TapCallback = ({ event }: { event: HandledEvents }) => void;

export type SwipeableDirectionCallbacks = {
  onSwipedDown?: SwipeCallback;
  onSwipedLeft?: SwipeCallback;
  onSwipedRight?: SwipeCallback;
  onSwipedUp?: SwipeCallback;
};

export type SwipeableCallbacks = SwipeableDirectionCallbacks & {
  onSwipeStart?: SwipeCallback;
  onSwiped?: SwipeCallback;
  onSwiping?: SwipeCallback;
  onTap?: TapCallback;
  onTouchStartOrOnMouseDown?: TapCallback;
  onTouchEndOrOnMouseUp?: TapCallback;
};

type ConfigurationOptionDelta =
  | number
  | { [key in Lowercase<SwipeDirections>]?: number };

interface ConfigurationOptions {
  delta?: ConfigurationOptionDelta | number;
  preventScrollOnSwipe?: boolean;
  rotationAngle?: number;
  trackMouse?: boolean;
  trackTouch?: boolean;
  swipeDuration?: number;
  touchEventOptions?: { passive: boolean };
}

export type SwipeableProps = SwipeableCallbacks & ConfigurationOptions;

export type SwipeablePropsWithDefaultOptions = SwipeableCallbacks &
  Required<ConfigurationOptions>;

export interface SwipeableHandlers {
  ref(element: HTMLElement | null): void;
  onMouseDown?(event: MouseEvent): void;
}

export type SwipeableState = {
  cleanUpTouch?: () => void;
  cleanUpMouse?: () => void;
  el?: HTMLElement;
  eventData?: SwipeEventData;
  first: boolean;
  initial: Vector2;
  start: number;
  swiping: boolean;
  xy: Vector2;
};

export type AttachTouch = (
  el: HTMLElement,
  props: SwipeablePropsWithDefaultOptions,
) => () => void;

export type Vector2 = [number, number];

const DEFAULT_DELTA = 10;

const defaultProps: Required<ConfigurationOptions> = {
  delta: DEFAULT_DELTA,
  preventScrollOnSwipe: false,
  rotationAngle: 0,
  trackMouse: false,
  trackTouch: true,
  swipeDuration: Infinity,
  touchEventOptions: { passive: true },
};

const initialState: SwipeableState = {
  first: true,
  initial: [0, 0],
  start: 0,
  swiping: false,
  xy: [0, 0],
};

const mouseMove = "mousemove";
const mouseUp = "mouseup";
const touchEnd = "touchend";
const touchMove = "touchmove";
const touchStart = "touchstart";

function getDirection(
  absX: number,
  absY: number,
  deltaX: number,
  deltaY: number,
): SwipeDirections {
  if (absX > absY) {
    if (deltaX > 0) {
      return RIGHT;
    }
    return LEFT;
  } else if (deltaY > 0) {
    return DOWN;
  }
  return UP;
}

function rotateXYByAngle(pos: Vector2, angle: number): Vector2 {
  if (angle === 0) return pos;
  const angleInRadians = (Math.PI / 180) * angle;
  const x =
    pos[0] * Math.cos(angleInRadians) + pos[1] * Math.sin(angleInRadians);
  const y =
    pos[1] * Math.cos(angleInRadians) - pos[0] * Math.sin(angleInRadians);
  return [x, y];
}

function getPropsWithDefaults(
  options: SwipeableProps,
): SwipeablePropsWithDefaultOptions {
  return {
    ...defaultProps,
    ...options,
    touchEventOptions: {
      ...defaultProps.touchEventOptions,
      ...options.touchEventOptions,
    },
  };
}

export function useSwipeable(options: SwipeableProps): SwipeableHandlers {
  const [state, setState] = createSignal<SwipeableState>(initialState);
  const [element, setElement] = createSignal<HTMLElement | null>(null);

  // Merge options with defaults
  const props = getPropsWithDefaults(options);

  const onStart = (event: HandledEvents) => {
    const isTouch = "touches" in event;
    // if more than a single touch don't track, for now...
    if (isTouch && event.touches.length > 1) return;

    setState((prevState) => {
      const currentProps = props;
      // setup mouse listeners on document to track swipe since swipe can leave container
      // Note: mousedown is attached to element, mousemove/mouseup are on document
      if (currentProps.trackMouse && !isTouch) {
        document.addEventListener(mouseMove, onMove);
        document.addEventListener(mouseUp, onUp);
      }
      const { clientX, clientY } = isTouch ? event.touches[0] : event;
      const xy = rotateXYByAngle(
        [clientX, clientY],
        currentProps.rotationAngle,
      );

      currentProps.onTouchStartOrOnMouseDown &&
        currentProps.onTouchStartOrOnMouseDown({ event });

      return {
        ...prevState,
        ...initialState,
        initial: xy.slice() as Vector2,
        xy,
        start: event.timeStamp || 0,
      };
    });
  };

  const onMove = (event: HandledEvents) => {
    setState((prevState) => {
      const currentProps = props;
      const isTouch = "touches" in event;
      // Discount a swipe if additional touches are present after
      // a swipe has started.
      if (isTouch && event.touches.length > 1) {
        return prevState;
      }

      // if swipe has exceeded duration stop tracking
      if (event.timeStamp - prevState.start > currentProps.swipeDuration) {
        return prevState.swiping ? { ...prevState, swiping: false } : prevState;
      }

      const { clientX, clientY } = isTouch ? event.touches[0] : event;
      const [x, y] = rotateXYByAngle(
        [clientX, clientY],
        currentProps.rotationAngle,
      );
      const deltaX = x - prevState.xy[0];
      const deltaY = y - prevState.xy[1];
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const time = (event.timeStamp || 0) - prevState.start;
      const velocity = Math.sqrt(absX * absX + absY * absY) / (time || 1);
      const vxvy: Vector2 = [deltaX / (time || 1), deltaY / (time || 1)];

      const dir = getDirection(absX, absY, deltaX, deltaY);

      // if swipe is under delta and we have not started to track a swipe: skip update
      const delta =
        typeof currentProps.delta === "number"
          ? currentProps.delta
          : currentProps.delta[
              dir.toLowerCase() as Lowercase<SwipeDirections>
            ] || DEFAULT_DELTA;
      if (absX < delta && absY < delta && !prevState.swiping) return prevState;

      const eventData = {
        absX,
        absY,
        deltaX,
        deltaY,
        dir,
        event,
        first: prevState.first,
        initial: prevState.initial,
        velocity,
        vxvy,
      };

      // call onSwipeStart if present and is first swipe event
      eventData.first &&
        currentProps.onSwipeStart &&
        currentProps.onSwipeStart(eventData);

      // call onSwiping if present
      currentProps.onSwiping && currentProps.onSwiping(eventData);

      // track if a swipe is cancelable (handler for swiping or swiped(dir) exists)
      // so we can call preventDefault if needed
      let cancelablePageSwipe = false;
      if (
        currentProps.onSwiping ||
        currentProps.onSwiped ||
        currentProps[`onSwiped${dir}` as keyof SwipeableDirectionCallbacks]
      ) {
        cancelablePageSwipe = true;
      }

      if (
        cancelablePageSwipe &&
        currentProps.preventScrollOnSwipe &&
        currentProps.trackTouch &&
        event.cancelable
      ) {
        event.preventDefault();
      }

      return {
        ...prevState,
        // first is now always false
        first: false,
        eventData,
        swiping: true,
        xy: [x, y],
      };
    });
  };

  const onEnd = (event: HandledEvents) => {
    setState((prevState) => {
      const currentProps = props;
      let eventData: SwipeEventData | undefined;
      if (prevState.swiping && prevState.eventData) {
        // if swipe is less than duration fire swiped callbacks
        if (event.timeStamp - prevState.start < currentProps.swipeDuration) {
          eventData = { ...prevState.eventData, event };
          currentProps.onSwiped && currentProps.onSwiped(eventData);

          const onSwipedDir =
            currentProps[
              `onSwiped${eventData.dir}` as keyof SwipeableDirectionCallbacks
            ];
          onSwipedDir && onSwipedDir(eventData);
        }
      } else {
        currentProps.onTap && currentProps.onTap({ event });
      }

      currentProps.onTouchEndOrOnMouseUp &&
        currentProps.onTouchEndOrOnMouseUp({ event });

      return { ...prevState, ...initialState, eventData };
    });
  };

  const cleanUpMouse = () => {
    // safe to just call removeEventListener
    document.removeEventListener(mouseMove, onMove);
    document.removeEventListener(mouseUp, onUp);
  };

  const onUp = (e: HandledEvents) => {
    cleanUpMouse();
    onEnd(e);
  };

  /**
   * The value of passive on touchMove depends on `preventScrollOnSwipe`:
   * - true => { passive: false }
   * - false => { passive: true } // Default
   *
   * NOTE: When preventScrollOnSwipe is true, we attempt to call preventDefault to prevent scroll.
   *
   * props.touchEventOptions can also be set for all touch event listeners,
   * but for `touchmove` specifically when `preventScrollOnSwipe` it will
   * supersede and force passive to false.
   *
   */
  const attachTouch: AttachTouch = (el, currentProps) => {
    let cleanup = () => {};
    if (el && el.addEventListener) {
      const baseOptions = {
        ...defaultProps.touchEventOptions,
        ...currentProps.touchEventOptions,
      };
      // attach touch event listeners and handlers
      const tls: [
        typeof touchStart | typeof touchMove | typeof touchEnd,
        (e: HandledEvents) => void,
        { passive: boolean },
      ][] = [
        [touchStart, onStart, baseOptions],
        // preventScrollOnSwipe option supersedes touchEventOptions.passive
        [
          touchMove,
          onMove,
          {
            ...baseOptions,
            ...(currentProps.preventScrollOnSwipe ? { passive: false } : {}),
          },
        ],
        [touchEnd, onEnd, baseOptions],
      ];
      tls.forEach(([e, h, o]) => el.addEventListener(e, h, o));
      // return properly scoped cleanup method for removing listeners, options not required
      cleanup = () => tls.forEach(([e, h]) => el.removeEventListener(e, h));
    }
    return cleanup;
  };

  // Handle element ref and attach/detach touch and mouse listeners
  createEffect(() => {
    const el = element();
    const currentState = state();

    if (!el) {
      // Clean up if element is removed
      if (currentState.cleanUpTouch) {
        currentState.cleanUpTouch();
      }
      if (currentState.cleanUpMouse) {
        currentState.cleanUpMouse();
      }
      setState((prevState) => ({
        ...prevState,
        el: undefined,
        cleanUpTouch: undefined,
        cleanUpMouse: undefined,
      }));
      return;
    }

    // if the same DOM el as previous just return
    if (currentState.el === el) return;

    // if new DOM el clean up old DOM and reset cleanup functions
    if (currentState.el && currentState.el !== el) {
      if (currentState.cleanUpTouch) {
        currentState.cleanUpTouch();
      }
      if (currentState.cleanUpMouse) {
        currentState.cleanUpMouse();
      }
    }

    const addState: { cleanUpTouch?: () => void; cleanUpMouse?: () => void } =
      {};

    // attach touch listeners if we want to track touch
    if (props.trackTouch && el) {
      addState.cleanUpTouch = attachTouch(el, props);
    }

    // attach mouse listeners if we want to track mouse
    if (props.trackMouse && el) {
      el.addEventListener("mousedown", onStart);
      addState.cleanUpMouse = () => {
        el.removeEventListener("mousedown", onStart);
      };
    }

    setState((prevState) => ({
      ...prevState,
      el,
      ...addState,
    }));
  });

  // Cleanup on unmount
  onCleanup(() => {
    const currentState = state();
    if (currentState.cleanUpTouch) {
      currentState.cleanUpTouch();
    }
    if (currentState.cleanUpMouse) {
      currentState.cleanUpMouse();
    }
    // Also cleanup any active mouse listeners on document
    cleanUpMouse();
  });

  const onRef = (el: HTMLElement | null) => {
    // "inline" ref functions are called twice on render, once with null then again with DOM element
    // ignore null here
    if (el === null) {
      setElement(null);
      return;
    }
    setElement(el);
  };

  // set ref callback to attach touch event listeners
  const output: SwipeableHandlers = {
    ref: onRef,
  };

  // if track mouse attach mouse down listener
  if (props.trackMouse) {
    output.onMouseDown = onStart;
  }

  return output;
}
