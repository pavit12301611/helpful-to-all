import { MODERATION_ACTIONS, REPORT_REASONS, TARGET_TYPES } from '@/lib/enums';

export type ModerationActionKey = (typeof MODERATION_ACTIONS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Targets that a member can report. */
export const REPORTABLE_TARGETS = [
  'help_request',
  'help_response',
  'comment',
  'group_post',
  'user',
  'resource',
  'opportunity',
  'campaign',
  'skill_offer',
  'skill_request',
  'message',
  'student_resource',
  'missing_person',
] as const;

export type ReportableTarget = (typeof REPORTABLE_TARGETS)[number];

export function isReportable(value: string): value is ReportableTarget {
  return (REPORTABLE_TARGETS as readonly string[]).includes(value);
}

export type { TARGET_TYPES };
