'use client';

import * as React from 'react';
import { Coffee, Flag, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardHeader, Stat } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';

/**
 * Timers: pomodoro, stopwatch and countdown.
 *
 * Everything runs client-side. Finished pomodoro sessions are kept in
 * localStorage only, so nothing is written to the OpenHub database and the
 * feature still works with the database switched off.
 */

const STORAGE_KEY = 'openhub.pomodoro.sessions';

export type PomodoroSession = { finishedAt: string; minutes: number; kind: 'focus' | 'break' };

export function loadSessions(): PomodoroSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PomodoroSession[]).slice(0, 100) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: PomodoroSession[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 100)));
  } catch {
    /* storage blocked (private mode) — the timer still works */
  }
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Pomodoro state machine, kept pure so it can be unit tested. */
export function nextPomodoroState(state: { mode: 'focus' | 'break'; completed: number }, finished: boolean) {
  if (!finished) return state;
  return state.mode === 'focus'
    ? { mode: 'break' as const, completed: state.completed + 1 }
    : { mode: 'focus' as const, completed: state.completed };
}

export function PomodoroTimer() {
  const [focusMinutes, setFocusMinutes] = React.useState(25);
  const [breakMinutes, setBreakMinutes] = React.useState(5);
  const [mode, setMode] = React.useState<'focus' | 'break'>('focus');
  const [remaining, setRemaining] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [completed, setCompleted] = React.useState(0);
  const [sessions, setSessions] = React.useState<PomodoroSession[]>([]);

  React.useEffect(() => {
    setSessions(loadSessions());
  }, []);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) return current - 1;
        window.clearInterval(id);
        setRunning(false);
        const justFinishedMode = mode;
        setMode((currentMode) => {
          const next = nextPomodoroState({ mode: currentMode, completed }, true);
          setCompleted(next.completed);
          if (currentMode === 'focus') {
            const minutes = focusMinutes;
            setSessions((current2) => {
              const updated = [{ finishedAt: new Date().toISOString(), minutes, kind: 'focus' as const }, ...current2];
              saveSessions(updated);
              return updated;
            });
          }
          return next.mode;
        });
        setRemaining(justFinishedMode === 'focus' ? breakMinutes * 60 : focusMinutes * 60);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, breakMinutes, focusMinutes, completed]);

  function reset(toMode: 'focus' | 'break' = mode) {
    setRunning(false);
    setMode(toMode);
    setRemaining((toMode === 'focus' ? focusMinutes : breakMinutes) * 60);
  }

  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);

  return (
    <Card>
      <CardHeader
        title="Pomodoro"
        description="Work in blocks, rest between them. Sessions stay in this browser only."
        action={<Badge tone={mode === 'focus' ? 'primary' : 'success'}>{mode === 'focus' ? 'focus' : 'break'}</Badge>}
      />
      <CardContent className="grid gap-4">
        <p className="text-center text-5xl font-semibold tabular-nums text-foreground" role="timer" aria-live="off">
          {formatClock(remaining)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => setRunning((value) => !value)}>
            <Play className="h-4 w-4" aria-hidden="true" /> {running ? 'Pause' : 'Start'}
          </Button>
          <Button type="button" variant="outline" onClick={() => reset()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
          </Button>
          <Button type="button" variant="ghost" onClick={() => reset(mode === 'focus' ? 'break' : 'focus')}>
            <Coffee className="h-4 w-4" aria-hidden="true" /> Switch to {mode === 'focus' ? 'break' : 'focus'}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Focus minutes" name="pomo-focus">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={120}
                value={focusMinutes}
                onChange={(event) => setFocusMinutes(Math.max(1, Math.min(120, Number(event.target.value))))}
              />
            )}
          </Field>
          <Field label="Break minutes" name="pomo-break">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={60}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(Math.max(1, Math.min(60, Number(event.target.value))))}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Blocks completed" value={completed} hint="This session" />
          <Stat label="Focused minutes" value={totalMinutes} hint="Saved in this browser" />
        </div>
        {sessions.length > 0 ? (
          <div className="grid gap-2">
            <p className="label">Recent blocks</p>
            <ul className="grid gap-1">
              {sessions.slice(0, 5).map((session, index) => (
                <li key={`${session.finishedAt}-${index}`} className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{new Date(session.finishedAt).toLocaleString()}</span>
                  <span>{session.minutes} min</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => {
                setSessions([]);
                saveSessions([]);
              }}
            >
              Clear history
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function Stopwatch() {
  const [elapsed, setElapsed] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [laps, setLaps] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <Card>
      <CardHeader title="Stopwatch" description="Count up, take laps, reset any time." />
      <CardContent className="grid gap-4">
        <p className="text-center text-5xl font-semibold tabular-nums text-foreground" role="timer" aria-live="off">
          {formatClock(elapsed)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => setRunning((value) => !value)}>
            <Play className="h-4 w-4" aria-hidden="true" /> {running ? 'Pause' : 'Start'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setLaps((current) => [elapsed, ...current])} disabled={elapsed === 0}>
            <Flag className="h-4 w-4" aria-hidden="true" /> Lap
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRunning(false);
              setElapsed(0);
              setLaps([]);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
          </Button>
        </div>
        {laps.length > 0 ? (
          <ol className="grid gap-1">
            {laps.map((lap, index) => (
              <li key={`${lap}-${index}`} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Lap {laps.length - index}</span>
                <span className="tabular-nums">{formatClock(lap)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CountdownTimer() {
  const [minutes, setMinutes] = React.useState(10);
  const [seconds, setSeconds] = React.useState(0);
  const [target, setTarget] = React.useState<number | null>(null);
  const [remaining, setRemaining] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!running || target === null) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((target - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(id);
        setRunning(false);
        setDone(true);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [running, target]);

  return (
    <Card>
      <CardHeader title="Countdown" description="Set a length and count down. Nothing is stored on the server." />
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Minutes" name="cd-minutes">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={600}
                value={minutes}
                onChange={(event) => setMinutes(Math.max(0, Math.min(600, Number(event.target.value))))}
              />
            )}
          </Field>
          <Field label="Seconds" name="cd-seconds">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(event) => setSeconds(Math.max(0, Math.min(59, Number(event.target.value))))}
              />
            )}
          </Field>
          <Field label="Presets" name="cd-preset">
            {({ id }) => (
              <Select
                id={id}
                value=""
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!value) return;
                  setMinutes(Math.floor(value / 60));
                  setSeconds(value % 60);
                }}
              >
                <option value="">Choose…</option>
                <option value="300">5 minutes</option>
                <option value="600">10 minutes</option>
                <option value="1500">25 minutes</option>
                <option value="3600">1 hour</option>
              </Select>
            )}
          </Field>
        </div>
        <p className="text-center text-5xl font-semibold tabular-nums text-foreground" role="timer" aria-live="off">
          {formatClock(running || remaining > 0 ? remaining : minutes * 60 + seconds)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              if (!running) {
                setDone(false);
                setTarget(Date.now() + (remaining > 0 ? remaining : minutes * 60 + seconds) * 1000);
              }
              setRunning((value) => !value);
            }}
          >
            <Play className="h-4 w-4" aria-hidden="true" /> {running ? 'Pause' : remaining > 0 ? 'Resume' : 'Start'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRunning(false);
              setTarget(null);
              setRemaining(0);
              setDone(false);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
          </Button>
        </div>
        {done ? <Alert tone="success">Time is up.</Alert> : null}
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <TimerIcon className="h-4 w-4" aria-hidden="true" /> Timers stop when you close the tab.
        </p>
      </CardContent>
    </Card>
  );
}
