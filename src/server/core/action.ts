import { ZodError, type ZodType } from 'zod';
import { AppError, isAppError, type FieldErrors } from '@/lib/errors';
import { currentUser, type SessionUser } from '@/server/core/guards';

/**
 * Server action plumbing.
 *
 * `runAction` is the single boundary between the UI and the service layer:
 *   - validates input with Zod (services also validate, this is defence in depth)
 *   - normalises every failure into a serialisable ActionResult
 *   - never leaks stack traces or database errors to the browser
 */

export type ActionResult<T = unknown> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export type ActionContext = {
  /** Present when the action ran for a signed-in user. */
  user: SessionUser | null;
};

/**
 * Execute a service call as a server action.
 *
 * @param handler receives the parsed input and the (optional) current user
 */
export async function runAction<TInput = undefined, TOutput = void>(options: {
  schema?: ZodType<TInput>;
  input?: unknown;
  requireAuth?: boolean;
  successMessage?: string;
  handler: (input: TInput, context: ActionContext) => Promise<TOutput>;
}): Promise<ActionResult<TOutput>> {
  const user = await currentUser();
  if (options.requireAuth !== false && !user) {
    return fail('You need to sign in to do that.');
  }

  let input = options.input as TInput;
  if (options.schema) {
    const parsed = options.schema.safeParse(options.input);
    if (!parsed.success) {
      return fail('Please check the highlighted fields.', zodFieldErrors(parsed.error));
    }
    input = parsed.data;
  }

  try {
    const data = await options.handler(input, { user });
    return { ok: true, data, message: options.successMessage };
  } catch (error) {
    if (isAppError(error)) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    }
    if (error instanceof ZodError) {
      return fail('Please check the highlighted fields.', zodFieldErrors(error));
    }
    if (error instanceof AppError) {
      return fail(error.message);
    }
    console.error('[openhub] unhandled action error', error);
    return fail('Something went wrong on our side. Please try again in a moment.');
  }
}
