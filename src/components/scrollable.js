/**
 * Scrollable — vertical scroll container for terminal UIs
 *
 * Wraps children in a viewport with a fixed visible height.
 * Uses negative margin-top to shift content up (Yoga-compatible)
 * combined with overflowY="hidden" clipping at the render-output level.
 *
 * Supports:
 *   • Up/Down arrow keys
 *   • Page Up / Page Down
 *   • Home key (jump to top)
 *   • Mouse wheel via SGR extended mouse mode (DECSET 1006 + 1002)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout, useStdin } from 'ink';
import { THEME } from '../theme.js';

const C = THEME.colors;

// ── SGR mouse helpers ────────────────────────────────────────────────
// DECSET 1002 = button-event tracking, 1006 = SGR extended coordinates
const SGR_ENABLE = '\x1b[?1002h\x1b[?1006h';
const SGR_DISABLE = '\x1b[?1006l\x1b[?1002l';

// SGR mouse: ESC[<buttons;x;yM (press) or ESC[<buttons;x;ym (release)
const SGR_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/;

const WHEEL_UP = 64;
const WHEEL_DOWN = 65;

// ── Component ────────────────────────────────────────────────────────

export default function Scrollable({ children, ...rest }) {
  const { stdout } = useStdout();
  const { stdin } = useStdin();
  const [scrollY, setScrollY] = useState(0);

  const terminalHeight = stdout?.rows || 24;
  // Reserve 1 row for the scroll indicator
  const viewportHeight = terminalHeight - 1;

  // ── Keyboard ────────────────────────────────────────────────────
  useInput((_input, key) => {
    if (key.upArrow) {
      setScrollY(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollY(prev => prev + 1);
    }
    if (key.pageUp) {
      setScrollY(prev => Math.max(0, prev - viewportHeight));
    }
    if (key.pageDown) {
      setScrollY(prev => prev + viewportHeight);
    }
    if (key.home) {
      setScrollY(0);
    }
  });

  // ── Mouse wheel via SGR mode ────────────────────────────────────
  useEffect(() => {
    if (!stdin || !stdout) return;

    try {
      stdout.write(SGR_ENABLE);
    } catch {
      /* stdout may not support writes in all environments */
    }

    const handler = (data) => {
      const str = data.toString();
      const m = str.match(SGR_RE);
      if (!m) return;

      const button = parseInt(m[1], 10);

      if (button === WHEEL_UP) {
        setScrollY(prev => Math.max(0, prev - 3));
      } else if (button === WHEEL_DOWN) {
        setScrollY(prev => prev + 3);
      }
    };

    stdin.on('data', handler);

    return () => {
      stdin.off('data', handler);
      try {
        stdout.write(SGR_DISABLE);
      } catch {
        /* best-effort cleanup */
      }
    };
  }, [stdin, stdout]);

  // ── Render ────────────────────────────────────────────────────────

  // Use negative marginTop to shift content upward within the viewport.
  // Yoga supports negative margins natively, and Ink's renderer clips
  // content that extends beyond a parent with overflowY="hidden".
  const shift = -scrollY;

  return (
    <Box flexDirection="column" {...rest}>
      {/* Viewport — fixed height + overflow clipping */}
      <Box height={viewportHeight} overflowY="hidden">
        <Box marginTop={shift} flexDirection="column" width="100%">
          {children}
        </Box>
      </Box>

      {/* Scroll indicator */}
      <Box justifyContent="center" minHeight={1}>
        {scrollY > 0 ? (
          <Text dimColor>
            {'\u2191'} {'\u2193'} scrolled {scrollY} line{scrollY === 1 ? '' : 's'}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
