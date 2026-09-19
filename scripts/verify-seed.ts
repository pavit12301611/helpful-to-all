import { getDb, disconnectDb } from '../src/server/db/client';
async function main() {
  const db = await getDb();
  const counts: Record<string, number> = {
    users: await db.user.count(),
    roles: await db.role.count(),
    permissions: await db.permission.count(),
    rolePermissions: await db.rolePermission.count(),
    categories: await db.category.count(),
    emergencyNumbers: await db.emergencyNumber.count(),
    guides: await db.guide.count(),
    subjects: await db.subject.count(),
    studentResources: await db.studentResource.count(),
    flashcards: await db.flashcard.count(),
    skills: await db.skill.count(),
    skillOffers: await db.skillOffer.count(),
    skillConnections: await db.skillConnection.count(),
    localResources: await db.localResource.count(),
    opportunities: await db.volunteerOpportunity.count(),
    campaigns: await db.donationCampaign.count(),
    bloodDonors: await db.bloodDonorProfile.count(),
    helpRequests: await db.helpRequest.count(),
    helpResponses: await db.helpResponse.count(),
    comments: await db.comment.count(),
    votes: await db.vote.count(),
    savedItems: await db.savedItem.count(),
    groups: await db.group.count(),
    groupMembers: await db.groupMember.count(),
    groupPosts: await db.groupPost.count(),
    polls: await db.poll.count(),
    pollOptions: await db.pollOption.count(),
    shoppingItems: await db.shoppingItem.count(),
    tasks: await db.task.count(),
    subtasks: await db.subtask.count(),
    habits: await db.habit.count(),
    habitLogs: await db.habitLog.count(),
    expenses: await db.expense.count(),
    expenseSplits: await db.expenseSplit.count(),
    events: await db.calendarEvent.count(),
    trips: await db.trip.count(),
    itinerary: await db.itineraryItem.count(),
    businesses: await db.businessProfile.count(),
    invoices: await db.invoice.count(),
    reports: await db.report.count(),
    messages: await db.message.count(),
    listings: await db.listing.count(),
    assignments: await db.assignment.count(),
    timetable: await db.timetableSlot.count(),
  };
  console.log(JSON.stringify(counts, null, 0));
  const solved = await db.helpRequest.findFirst({ where: { status: 'solved' } });
  console.log('accepted response set:', Boolean(solved?.acceptedResponseId));
  await disconnectDb();
}
main();
