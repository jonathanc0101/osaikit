/**
 * Loading screen — shows a spinner and per-source status while
 * leaderboard data is being fetched in parallel.
 *
 * Patio Design System: green (#35FF38) accent, white text, dark theme.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

const SOURCES = [
  { key: 'huggingface', label: 'HuggingFace Open LLM Leaderboard' },
  { key: 'swebench', label: 'SWE-bench Verified' },
  { key: 'aider', label: 'Aider Polyglot Benchmark' },
  { key: 'livecodebench', label: 'LiveCodeBench' },
  { key: 'bigcodebench', label: 'BigCodeBench' },
];

/**
 * @param {Object} props
 * @param {Record<string, 'pending'|'done'|'error'>} props.sourceStatus
 *   Map of source key to current fetch status.
 */
export default function Loading({ sourceStatus = {} }) {
  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      paddingX: 2,
      paddingY: 1,
      borderStyle: 'round',
      borderColor: 'green',
    },

    // Title row with spinner
    React.createElement(
      Box,
      { gap: 1, marginBottom: 1 },
      React.createElement(Text, { color: 'green' }, React.createElement(Spinner, { type: 'dots' })),
      React.createElement(Text, { bold: true, color: 'white' }, 'Fetching live leaderboard data...'),
    ),

    // Per-source status lines
    ...SOURCES.map((source) => {
      const status = sourceStatus[source.key] || 'pending';
      let icon;
      let color;

      if (status === 'done') {
        icon = '\u2714';
        color = 'green';
      } else if (status === 'error') {
        icon = '\u2716';
        color = 'red';
      } else {
        icon = null;
        color = 'gray';
      }

      return React.createElement(
        Box,
        { key: source.key, gap: 1, marginLeft: 2 },
        status === 'pending'
          ? React.createElement(Text, { color: 'green' }, React.createElement(Spinner, { type: 'dots' }))
          : React.createElement(Text, { color }, icon),
        React.createElement(
          Text,
          { color: status === 'done' ? 'white' : status === 'error' ? 'red' : 'gray' },
          source.label,
        ),
      );
    }),

    // Hint
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { dimColor: true, color: 'gray' },
        'This takes a few seconds \u2014 results are cached for the session.',
      ),
    ),
  );
}
