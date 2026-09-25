import { describe, it, expect } from 'vitest'
import { isOnFocusBoard, type FocusBoardCandidate } from '../focus-utils'

const weekBounds = { start: '2026-03-02T00:00:00.000Z', end: '2026-03-08T23:59:59.999Z' }

function task(overrides: Partial<FocusBoardCandidate> = {}): FocusBoardCandidate {
  return {
    status: 'not_started',
    toComplete: null,
    deadline: null,
    dismissedFromFocus: null,
    starredAt: null,
    ...overrides,
  }
}

describe('isOnFocusBoard', () => {
  const cases: Array<{
    name: string
    overrides: Partial<FocusBoardCandidate>
    expected: boolean
  }> = [
    {
      name: 'starred task without dates is on the board',
      overrides: { starredAt: '2026-03-01T00:00:00.000Z' },
      expected: true,
    },
    {
      name: 'task marked today is on the board',
      overrides: { toComplete: 'today' },
      expected: true,
    },
    {
      name: 'task marked this_week is on the board',
      overrides: { toComplete: 'this_week' },
      expected: true,
    },
    {
      name: 'task due within the week is on the board',
      overrides: { deadline: '2026-03-05' },
      expected: true,
    },
    {
      name: 'deadline on the first day of the week is on the board',
      overrides: { deadline: '2026-03-02' },
      expected: true,
    },
    {
      name: 'deadline on the last day of the week is on the board',
      overrides: { deadline: '2026-03-08' },
      expected: true,
    },
    {
      name: 'deadline before this week is not on the board',
      overrides: { deadline: '2026-03-01' },
      expected: false,
    },
    {
      name: 'deadline after this week is not on the board',
      overrides: { deadline: '2026-03-09' },
      expected: false,
    },
    {
      name: 'task with no dates and no star is not on the board',
      overrides: {},
      expected: false,
    },
    {
      name: 'marked next_2_days without a deadline is not on the board',
      overrides: { toComplete: 'next_2_days' },
      expected: false,
    },
    {
      name: 'completed task is not on the board',
      overrides: { toComplete: 'today', status: 'done' },
      expected: false,
    },
    {
      name: 'dismissed task is not on the board',
      overrides: {
        toComplete: 'today',
        dismissedFromFocus: '2026-03-01T00:00:00.000Z',
      },
      expected: false,
    },
    {
      name: 'dismissed task with a leftover star is not on the board',
      overrides: {
        starredAt: '2026-03-01T00:00:00.000Z',
        dismissedFromFocus: '2026-03-02T00:00:00.000Z',
      },
      expected: false,
    },
  ]

  it.each(cases)('$name', ({ overrides, expected }) => {
    expect(isOnFocusBoard(task(overrides), weekBounds)).toBe(expected)
  })
})
