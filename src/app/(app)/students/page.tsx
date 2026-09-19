import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import {
  listAssignments,
  listDecks,
  listExams,
  listGrades,
  listListings,
  listResources,
  listSubjects,
  listTimetable,
} from '@/features/students/service';
import { RESOURCE_PAGE_SIZE, LISTING_PAGE_SIZE, computeGpa, listingFilters, resourceFilters } from '@/features/students/schemas';
import {
  AssignmentForm,
  AssignmentRow,
  DeckCard,
  DeckForm,
  ExamForm,
  ExamRow,
  GradeForm,
  GradeRow,
  ListingKindFilter,
  ListingRow,
  ResourceForm,
  ResourceRow,
  ResumeBuilder,
  TimetableForm,
  TimetableGrid,
} from '@/features/students/components';
import { Card, CardContent, CardHeader, SectionHeading, Stat, labelize } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';
import { DIFFICULTY, EDUCATION_LEVELS, RESOURCE_FILE_TYPES } from '@/lib/enums';

export const metadata: Metadata = { title: 'Student centre' };

const TABS = [
  { key: 'resources', label: 'Resources' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'planner', label: 'Planner' },
  { key: 'gpa', label: 'GPA' },
  { key: 'opportunities', label: 'Scholarships' },
  { key: 'builder', label: 'Resume builder' },
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'resources';
  const db = await getDb();

  const subjects = await listSubjects();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });

  const filters = resourceFilters.parse({
    q: params.q,
    subject: params.subject,
    level: params.level,
    language: params.language,
    difficulty: params.difficulty,
    fileType: params.fileType,
    institution: params.institution,
    tag: params.tag,
    sort: params.sort ?? 'recent',
    page: params.page,
  });

  const listingQuery = listingFilters.parse({ kind: params.kind, q: params.q, page: params.page });

  const [resourceResult, decks, assignments, exams, timetable, grades, listingResult] = await Promise.all([
    listResources(user.id, filters),
    listDecks(user.id),
    listAssignments(user.id),
    listExams(user.id),
    listTimetable(user.id),
    listGrades(user.id),
    listListings(listingQuery),
  ]);

  const gpa = computeGpa(grades);
  const upcomingExams = exams.filter((exam) => exam.examAt > new Date()).length;
  const openAssignments = assignments.filter((assignment) => assignment.status !== 'graded' && assignment.status !== 'submitted').length;

  const filterParams: Record<string, string | undefined> = {
    q: filters.q,
    subject: filters.subject,
    level: filters.level,
    language: filters.language,
    difficulty: filters.difficulty,
    fileType: filters.fileType,
    institution: filters.institution,
    tag: filters.tag,
    sort: filters.sort,
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Student centre"
        description="Study resources, flashcards, assignments, exams, timetable, GPA and opportunities in one place."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Resources shared" value={String(resourceResult.total)} icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />} />
        <Stat label="Open assignments" value={String(openAssignments)} hint={`${upcomingExams} upcoming exam${upcomingExams === 1 ? '' : 's'}`} />
        <Stat label="GPA (10 point scale)" value={gpa.gpa.toFixed(2)} hint={`${gpa.credits} credits · about ${gpa.percentage}%`} />
      </div>

      <Tabs tabs={TABS} current={tab} basePath="/students" searchParams={filterParams} />

      {tab === 'resources' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Share a resource" description="Notes, links or videos you have the right to share." />
            <CardContent>
              <ResourceForm subjects={subjects} />
            </CardContent>
          </Card>

          <form action="/students" className="flex flex-wrap items-end gap-2" role="search">
            <input type="hidden" name="tab" value="resources" />
            <div>
              <label htmlFor="res-q" className="label">
                Search
              </label>
              <input id="res-q" name="q" defaultValue={filters.q ?? ''} className="input-base max-w-xs" placeholder="Search resources" />
            </div>
            <div>
              <label htmlFor="res-subject" className="label">
                Subject
              </label>
              <select id="res-subject" name="subject" defaultValue={filters.subject ?? ''} className="input-base">
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="res-level" className="label">
                Level
              </label>
              <select id="res-level" name="level" defaultValue={filters.level ?? ''} className="input-base">
                <option value="">Any level</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {labelize(level)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="res-language" className="label">
                Language
              </label>
              <input id="res-language" name="language" defaultValue={filters.language ?? ''} className="input-base w-20" placeholder="en" />
            </div>
            <div>
              <label htmlFor="res-difficulty" className="label">
                Difficulty
              </label>
              <select id="res-difficulty" name="difficulty" defaultValue={filters.difficulty ?? ''} className="input-base">
                <option value="">Any</option>
                {DIFFICULTY.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {labelize(difficulty)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="res-fileType" className="label">
                Type
              </label>
              <select id="res-fileType" name="fileType" defaultValue={filters.fileType ?? ''} className="input-base">
                <option value="">Any type</option>
                {RESOURCE_FILE_TYPES.map((fileType) => (
                  <option key={fileType} value={fileType}>
                    {labelize(fileType)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="res-institution" className="label">
                Institution
              </label>
              <input id="res-institution" name="institution" defaultValue={filters.institution ?? ''} className="input-base max-w-[10rem]" />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Apply filters
            </button>
          </form>

          {resourceResult.resources.length === 0 ? (
            <EmptyState title="No resources match these filters" description="Try removing a filter, or share the first resource for this subject." icon={<GraduationCap className="h-8 w-8" aria-hidden="true" />} />
          ) : (
            <ul className="space-y-2">
              {resourceResult.resources.map((resource) => (
                <ResourceRow key={resource.id} resource={resource} canManage={resource.uploaderId === user.id} />
              ))}
            </ul>
          )}

          <Pagination page={filters.page} pageSize={RESOURCE_PAGE_SIZE} total={resourceResult.total} basePath="/students" searchParams={{ ...filterParams, tab: 'resources' }} />
        </div>
      ) : null}

      {tab === 'flashcards' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Create a deck" description="Cards are private to your account and spaced out for review." />
            <CardContent>
              <DeckForm subjects={subjects} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Your decks (${decks.length})`} />
            <CardContent>
              {decks.length === 0 ? (
                <EmptyState title="No decks yet" description="Create one on the left, then add question and answer cards." />
              ) : (
                <ul className="space-y-2">
                  {decks.map((deck) => (
                    <DeckCard key={deck.id} deck={deck} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'planner' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Assignments" description="Track what is due and mark it submitted when it goes in." />
            <CardContent className="space-y-4">
              <AssignmentForm subjects={subjects} />
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((assignment) => (
                    <AssignmentRow key={assignment.id} assignment={assignment} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Exams" description="Countdowns are calculated from today." />
            <CardContent className="space-y-4">
              <ExamForm subjects={subjects} />
              {exams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exams scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {exams.map((exam) => (
                    <ExamRow key={exam.id} exam={exam} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Weekly timetable" description="Add each class once; it repeats every week." />
              <CardContent className="space-y-4">
                <TimetableForm subjects={subjects} />
                <TimetableGrid slots={timetable} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'gpa' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add a course grade" description="Uses the 10 point scale. Percentage is an approximation (GPA x 9.5)." />
            <CardContent>
              <GradeForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Your GPA"
              action={
                <span className="text-sm font-semibold text-foreground">
                  {gpa.gpa.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ 10</span>
                </span>
              }
            />
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {gpa.credits} credits across {grades.length} course{grades.length === 1 ? '' : 's'} · approximate {gpa.percentage}%
              </p>
              {grades.length === 0 ? (
                <EmptyState title="No grades yet" description="Add each course with its credits and grade point." />
              ) : (
                <ul className="space-y-2">
                  {grades.map((grade) => (
                    <GradeRow key={grade.id} grade={grade} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'opportunities' ? (
        <div className="space-y-4">
          <Alert tone="warning" title="Verify before you apply">
            OpenHub lists opportunities shared by the community. Always confirm details on the official website, and never pay
            a fee to apply for a scholarship.
          </Alert>
          <ListingKindFilter current={listingQuery.kind} />
          {listingResult.listings.length === 0 ? (
            <EmptyState title="No listings match" description="Try another type, or check back later." />
          ) : (
            <ul className="space-y-2">
              {listingResult.listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </ul>
          )}
          <Pagination page={listingQuery.page} pageSize={LISTING_PAGE_SIZE} total={listingResult.total} basePath="/students" searchParams={{ tab: 'opportunities', kind: listingQuery.kind }} />
        </div>
      ) : null}

      {tab === 'builder' ? (
        <Card>
          <CardHeader
            title="Resume and cover letter builder"
            description="Fill the fields, copy the text or download it. Nothing is stored on the server."
          />
          <CardContent>
            <ResumeBuilder
              defaults={{
                name: profile?.displayName ?? user.username,
                headline: profile?.availability ?? '',
                city: profile?.city ?? '',
                email: user.email,
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
