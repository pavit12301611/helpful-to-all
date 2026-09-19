/**
 * Central definitions for every enum-like value stored in the database.
 *
 * The Prisma schema stores these as strings so the same schema can run on
 * PostgreSQL and SQLite. This module is the single source of truth: services
 * and forms import the Zod schemas from here, so an invalid value can never
 * reach the database.
 */
import { z } from 'zod';

const list = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);

export const USER_ROLES = ['user', 'student', 'volunteer', 'organizer', 'business', 'moderator', 'admin'] as const;
export const userRoleSchema = list(USER_ROLES);
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that can perform moderation. */
export const STAFF_ROLES: UserRole[] = ['moderator', 'admin'];

export const USER_TYPES = ['student', 'volunteer', 'organizer', 'business', 'neighbour', 'freelancer'] as const;
export const userTypeSchema = list(USER_TYPES);

export const LOCALES = ['en', 'hi'] as const;
export const localeSchema = list(LOCALES);

export const THEMES = ['light', 'dark', 'system'] as const;
export const themeSchema = list(THEMES);

export const PRIVACY_VISIBILITY = ['public', 'community', 'private'] as const;
export const visibilitySchema = list(PRIVACY_VISIBILITY);

export const MESSAGE_PERMISSIONS = ['everyone', 'contacts', 'none'] as const;

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const taskPrioritySchema = list(TASK_PRIORITIES);

export const RECURRENCE = ['none', 'daily', 'weekly', 'monthly'] as const;
export const recurrenceSchema = list(RECURRENCE);

export const HABIT_FREQUENCY = ['daily', 'weekly'] as const;

export const GROUP_KINDS = [
  'friends',
  'family',
  'class',
  'club',
  'neighborhood',
  'organization',
  'team',
  'travel',
] as const;
export const groupKindSchema = list(GROUP_KINDS);

export const GROUP_VISIBILITY = ['public', 'private', 'invite'] as const;
export const groupVisibilitySchema = list(GROUP_VISIBILITY);

export const GROUP_MEMBER_ROLES = ['owner', 'admin', 'moderator', 'member'] as const;
export const groupMemberRoleSchema = list(GROUP_MEMBER_ROLES);

export const GROUP_POST_KINDS = ['post', 'announcement', 'poll'] as const;

export const HELP_CATEGORIES = [
  'education',
  'technology',
  'jobs',
  'health_resources',
  'government_services',
  'legal_information',
  'household_assistance',
  'transportation',
  'food',
  'donations',
  'accessibility',
  'finance',
  'local_information',
] as const;
export const helpCategorySchema = list(HELP_CATEGORIES);

export const HELP_KINDS = ['question', 'request', 'offer'] as const;
export const helpKindSchema = list(HELP_KINDS);

export const HELP_URGENCY = ['low', 'normal', 'high', 'urgent'] as const;
export const helpUrgencySchema = list(HELP_URGENCY);

export const HELP_STATUS = ['open', 'in_progress', 'solved', 'closed'] as const;
export const helpStatusSchema = list(HELP_STATUS);

/** Categories where OpenHub must show a "not professional advice" disclaimer. */
export const DISCLAIMER_CATEGORIES = ['health_resources', 'legal_information', 'finance'] as const;

export const EDUCATION_LEVELS = ['school', 'highschool', 'undergraduate', 'postgraduate', 'other'] as const;
export const educationLevelSchema = list(EDUCATION_LEVELS);

export const DIFFICULTY = ['beginner', 'intermediate', 'advanced'] as const;
export const difficultySchema = list(DIFFICULTY);

export const RESOURCE_FILE_TYPES = ['pdf', 'notes', 'video', 'link', 'other'] as const;

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export const skillLevelSchema = list(SKILL_LEVELS);

export const SKILL_FORMATS = ['online', 'inperson', 'both'] as const;
export const skillFormatSchema = list(SKILL_FORMATS);

export const PRICE_MODES = ['free', 'exchange', 'paid'] as const;

export const CONNECTION_STATUS = ['pending', 'accepted', 'declined', 'cancelled', 'completed'] as const;

export const LOCAL_RESOURCE_CATEGORIES = [
  'hospital',
  'clinic',
  'pharmacy',
  'blood_bank',
  'library',
  'school',
  'coaching',
  'repair',
  'public_toilet',
  'shelter',
  'food_bank',
  'government',
  'emergency',
  'restaurant',
  'accessible',
  'donation_center',
  'community_org',
] as const;
export const localResourceCategorySchema = list(LOCAL_RESOURCE_CATEGORIES);

export const RESOURCE_STATUS = ['pending', 'active', 'rejected'] as const;

export const VOLUNTEER_CAUSES = [
  'education',
  'health',
  'environment',
  'food',
  'housing',
  'animals',
  'children',
  'elderly',
  'disaster_relief',
  'accessibility',
  'community',
  'other',
] as const;
export const volunteerCauseSchema = list(VOLUNTEER_CAUSES);

export const CAMPAIGN_KINDS = ['money', 'goods', 'food', 'clothing', 'blood', 'other'] as const;
export const campaignKindSchema = list(CAMPAIGN_KINDS);

export const CAMPAIGN_STATUS = ['draft', 'open', 'in_progress', 'completed', 'cancelled'] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const bloodGroupSchema = list(BLOOD_GROUPS);

export const EMERGENCY_SERVICES = [
  'general',
  'police',
  'ambulance',
  'fire',
  'women_helpline',
  'child_helpline',
  'disaster',
] as const;
export const emergencyServiceSchema = list(EMERGENCY_SERVICES);

export const LISTING_KINDS = ['scholarship', 'internship', 'job', 'volunteer'] as const;
export const listingKindSchema = list(LISTING_KINDS);

export const ASSIGNMENT_STATUS = ['pending', 'in_progress', 'submitted', 'graded'] as const;
export const assignmentStatusSchema = list(ASSIGNMENT_STATUS);

export const INVOICE_STATUS = ['draft', 'sent', 'paid', 'overdue', 'void'] as const;
export const invoiceStatusSchema = list(INVOICE_STATUS);

export const APPOINTMENT_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'] as const;

export const TRIP_VISIBILITY = ['private', 'public'] as const;

export const REPORT_REASONS = ['spam', 'harassment', 'misinformation', 'copyright', 'scam', 'other'] as const;
export const reportReasonSchema = list(REPORT_REASONS);

export const REPORT_STATUS = ['open', 'reviewed', 'actioned', 'dismissed'] as const;

export const MODERATION_ACTIONS = [
  'hide',
  'restore',
  'warn',
  'suspend',
  'reinstate',
  'verify',
  'lock',
  'unlock',
  'delete',
] as const;

export const NOTIFICATION_TYPES = [
  'group_invite',
  'join_request',
  'comment',
  'answer',
  'skill_request',
  'event_reminder',
  'task_reminder',
  'moderation',
  'volunteer_signup',
  'resource_update',
  'message',
  'system',
] as const;
export const notificationTypeSchema = list(NOTIFICATION_TYPES);
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DIGEST_MODES = ['instant', 'daily', 'weekly', 'off'] as const;

export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'shopping',
  'travel',
  'business',
  'other',
] as const;
export const expenseCategorySchema = list(EXPENSE_CATEGORIES);

export const DASHBOARD_LAYOUTS = ['compact', 'comfortable'] as const;

export const GUIDE_KINDS = [
  'first_aid',
  'disaster_prep',
  'safety',
  'help',
  'policy',
  'terms',
  'guidelines',
] as const;

export const MISSING_PERSON_STATUS = ['open', 'found', 'closed'] as const;

/**
 * Polymorphic target types. Kept in one place so reports / comments / votes /
 * saved items / search results stay consistent.
 */
export const TARGET_TYPES = [
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
  'trip',
  'group',
  'note',
  'task',
] as const;
export const targetTypeSchema = list(TARGET_TYPES);
export type TargetType = (typeof TARGET_TYPES)[number];

export const POLL_TARGETS = ['group', 'trip'] as const;

export const FILE_STORAGE = ['local', 's3'] as const;

/** Upload validation limits (see src/server/services/uploads.ts). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
] as const;
