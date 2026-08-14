/**
 * AutoResizeTextarea
 * -------------------
 * A plain `<textarea>` wrapper that:
 *   1. Auto-resizes vertically to fit its content (so users never see the
 *      text "snap" to a fixed number of rows, or get a weird clipping when
 *      they paste long content).
 *   2. Re-syncs when the bound `value` changes externally (e.g. profile
 *      reloaded from the server).
 *   3. Preserves a sensible min/max height so the box doesn't grow forever.
 *
 * Drop-in replacement for the SkillProof AI Profile textareas that the user
 * reported as being hard to use ("likhe kete dile tai zeno na thake").
 */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export interface AutoResizeTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  minRows?: number;
  maxRows?: number;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minRows = 3, maxRows = 12, value, onChange, className, style, ...rest }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      // Reset so scrollHeight can be measured correctly.
      el.style.height = 'auto';
      const lineHeight = 22; // px — matches the text-xs + leading we use in the UI
      const minHeight = lineHeight * minRows + 20; // padding approximation
      const maxHeight = lineHeight * maxRows + 20;
      const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    // Re-sync on mount and whenever the value changes externally.
    useLayoutEffect(() => {
      resize();
    }, [value, minRows, maxRows]);

    useEffect(() => {
      // Resize on window resize too so wrapping changes are picked up.
      const onResize = () => resize();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <textarea
        ref={innerRef}
        value={value}
        onChange={(e) => {
          resize();
          onChange?.(e);
        }}
        rows={minRows}
        className={className}
        style={{ resize: 'vertical', ...style }}
        {...rest}
      />
    );
  },
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;
