'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Settings2 } from 'lucide-react';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/feedback';
import { WIDGETS, moveWidget, toggleWidget, type WidgetState } from '@/lib/dashboard';
import { DASHBOARD_LAYOUTS } from '@/lib/enums';
import { labelize } from '@/lib/utils';
import { saveDashboardSettingsAction, saveWidgetLayoutAction } from './actions';

/**
 * Dashboard customisation.
 *
 * Members choose which widgets they see, in which order, plus a default landing
 * module and the density of the layout. Nothing here is required to use OpenHub.
 */
export function DashboardCustomizer({
  widgets,
  layout,
  defaultModule,
  pinnedTools,
}: {
  widgets: WidgetState[];
  layout: string;
  defaultModule: string;
  pinnedTools: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<WidgetState[]>(widgets);
  const [draftLayout, setDraftLayout] = React.useState(layout);
  const [draftModule, setDraftModule] = React.useState(defaultModule);
  const [pending, setPending] = React.useState(false);
  const toast = useToast();

  React.useEffect(() => {
    setDraft(widgets);
  }, [widgets]);

  async function save() {
    setPending(true);
    try {
      const layoutResult = await saveWidgetLayoutAction({ widgets: draft });
      if (!layoutResult.ok) {
        toast.push({ tone: 'danger', title: 'Could not save', description: layoutResult.error });
        return;
      }
      const settingsResult = await saveDashboardSettingsAction({
        layout: draftLayout,
        defaultModule: draftModule,
        pinnedTools,
      });
      if (!settingsResult.ok) {
        toast.push({ tone: 'danger', title: 'Could not save preferences', description: settingsResult.error });
        return;
      }
      toast.push({ tone: 'success', title: 'Dashboard updated.' });
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        Customise
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Customise your dashboard"
        description="Show, hide and reorder the widgets you care about."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button onClick={save} loading={pending} type="button">
              Save dashboard
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="layout" className="label">
                Layout density
              </label>
              <select
                id="layout"
                className="input-base"
                value={draftLayout}
                onChange={(event) => setDraftLayout(event.target.value)}
              >
                {DASHBOARD_LAYOUTS.map((option) => (
                  <option key={option} value={option}>
                    {labelize(option)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="default-module" className="label">
                Default module after signing in
              </label>
              <select
                id="default-module"
                className="input-base"
                value={draftModule}
                onChange={(event) => setDraftModule(event.target.value)}
              >
                {['dashboard', 'tasks', 'help', 'groups', 'students', 'business'].map((option) => (
                  <option key={option} value={option}>
                    {labelize(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className="space-y-1.5">
            {draft.map((state, index) => {
              const definition = WIDGETS.find((widget) => widget.key === state.key);
              return (
                <li key={state.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setDraft((current) => toggleWidget(current, state.key))}
                    aria-pressed={state.visible}
                    aria-label={state.visible ? `Hide ${definition?.title}` : `Show ${definition?.title}`}
                    className={`rounded p-1 ${state.visible ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {state.visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${state.visible ? '' : 'text-muted-foreground line-through'}`}>
                      {definition?.title ?? state.key}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{definition?.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => moveWidget(current, state.key, -1))}
                    disabled={index === 0}
                    aria-label={`Move ${definition?.title} up`}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => moveWidget(current, state.key, 1))}
                    disabled={index === draft.length - 1}
                    aria-label={`Move ${definition?.title} down`}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </>
  );
}
