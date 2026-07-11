import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerEscape, type EscapeHandler } from '@/lib/escapeStack';

/**
 * Register this component as a layer on the central escape stack while
 * mounted (and `enabled`). Escape / footer Quit pops the topmost layer only,
 * so a popup registered after its screen shields the screen automatically —
 * no stopPropagation or capture-phase tricks needed.
 *
 * The handler may return `false` to decline (e.g. while typing in a field);
 * the keypress then falls through to legacy listeners.
 */
export function useEscape(handler: EscapeHandler, enabled: boolean = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return registerEscape(() => handlerRef.current());
  }, [enabled]);
}

/**
 * Screen-level convenience: Escape / footer Quit pops back one route
 * (or to an explicit path). For menu hubs and simple list screens that
 * have no popups of their own.
 */
export function useEscapeBack(to?: string) {
  const navigate = useNavigate();
  const toRef = useRef(to);
  toRef.current = to;

  useEffect(() => {
    return registerEscape(() => {
      if (toRef.current) navigate(toRef.current);
      else navigate(-1);
    });
    // navigate is stable in react-router v6
  }, [navigate]);
}
