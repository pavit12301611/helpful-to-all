/**
 * OpenHub demo seed.
 *
 * Creates the three demo accounts advertised on the sign-in page plus a small
 * but realistic set of content across every module so a fresh install is not
 * empty. Every record is clearly marked "Demo" and no real personal data,
 * address or phone number is used.
 *
 *   npm run db:seed            # seeds a fresh database
 *   npm run db:seed -- --force # wipes demo users first, then seeds again
 *
 * The password for every demo account defaults to `OpenHub!2345` and can be
 * overridden with the SEED_PASSWORD environment variable for self-hosters who
 * expose their instance publicly.
 */

import { getDb, disconnectDb } from '../src/server/db/client';
import { hashPassword } from '../src/lib/security';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'OpenHub!2345';
const CITY = 'Pune';
const COUNTRY = 'India';
const DAY = 86_400_000;

const openingHours = (open: string, close: string) =>
  JSON.stringify({
    mon: [open, close],
    tue: [open, close],
    wed: [open, close],
    thu: [open, close],
    fri: [open, close],
    sat: [open, close],
    sun: null,
  });

const dayKey = (offset: number) => new Date(Date.now() - offset * DAY).toISOString().slice(0, 10);

async function main() {
  const db = await getDb();
  const force = process.argv.includes('--force');

  const userCount = await db.user.count();
  if (userCount > 0 && !force) {
    console.log(`Seed skipped: ${userCount} user(s) already exist. Run \`npm run db:seed -- --force\` to re-seed.`);
    return;
  }
  if (force) {
    console.log('Force mode: removing existing users (cascades to their content)...');
    await db.user.deleteMany();
    await db.auditLog.deleteMany();
    await db.siteSetting.deleteMany();
    await db.category.deleteMany();
    await db.subject.deleteMany();
    await db.skill.deleteMany();
    await db.guide.deleteMany();
    await db.emergencyNumber.deleteMany();
    await db.tag.deleteMany();
    await db.listing.deleteMany();
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* ------------------------------------------------------------- accounts */

  const admin = await db.user.create({
    data: {
      email: 'admin@openhub.test',
      username: 'admin',
      passwordHash,
      role: 'admin',
      emailVerified: new Date(),
      locale: 'en',
      theme: 'system',
      profile: {
        create: {
          displayName: 'Demo Admin',
          bio: 'Demo administrator account. Used to show moderation and audit tooling.',
          city: CITY,
          country: COUNTRY,
          showLocation: false,
          searchable: true,
          allowMessages: 'contacts',
        },
      },
      dashboard: { create: { layout: 'comfortable', defaultModule: 'dashboard', widgets: '' } },
      notificationPrefs: { create: {} },
    },
  });

  const priya = await db.user.create({
    data: {
      email: 'priya@openhub.test',
      username: 'priya',
      passwordHash,
      role: 'student',
      emailVerified: new Date(),
      locale: 'en',
      theme: 'light',
      profile: {
        create: {
          displayName: 'Priya (demo)',
          bio: 'Demo student account. Studies electronics, volunteers on weekends.',
          city: CITY,
          country: COUNTRY,
          availability: 'Final year electronics student - free on weekends',
          showLocation: true,
          allowMessages: 'everyone',
        },
      },
      dashboard: { create: { layout: 'comfortable', defaultModule: 'students', widgets: '' } },
      notificationPrefs: { create: {} },
    },
  });

  const rahul = await db.user.create({
    data: {
      email: 'rahul@openhub.test',
      username: 'rahul',
      passwordHash,
      role: 'organizer',
      emailVerified: new Date(),
      locale: 'hi',
      theme: 'dark',
      profile: {
        create: {
          displayName: 'Rahul (demo)',
          bio: 'Demo organiser account. Runs a neighbourhood clean-up group and a small repair shop.',
          city: CITY,
          country: COUNTRY,
          availability: 'Community organiser and repair shop owner',
          showLocation: true,
          allowMessages: 'everyone',
        },
      },
      dashboard: { create: { layout: 'compact', defaultModule: 'groups', widgets: '' } },
      notificationPrefs: { create: {} },
    },
  });

  /* -------------------------------------------------- roles + permissions */

  const matrix: Record<string, string[]> = {
    user: [],
    student: [],
    volunteer: [],
    organizer: [],
    business: [],
    moderator: ['moderate:content', 'resources:verify', 'campaigns:verify', 'content:feature'],
    admin: [
      'moderate:content',
      'users:manage',
      'resources:verify',
      'campaigns:verify',
      'categories:manage',
      'settings:manage',
      'audit:view',
      'content:feature',
      'data:export',
    ],
  };

  for (const [key, permissionKeys] of Object.entries(matrix)) {
    const role = await db.role.upsert({
      where: { key },
      create: { key, name: key.charAt(0).toUpperCase() + key.slice(1), description: `Seeded role: ${key}`, isSystem: true },
      update: {},
    });
    for (const permissionKey of permissionKeys) {
      const permission = await db.permission.upsert({
        where: { key: permissionKey },
        create: { key: permissionKey, description: `Seeded permission ${permissionKey}` },
        update: {},
      });
      const existing = await db.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: permission.id },
      });
      if (!existing) await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
  }

  /* ------------------------------------------------------- site settings */

  const settings: Record<string, string> = {
    'site.name': 'OpenHub (demo instance)',
    'site.description': 'A self-hosted community utility platform. Seeded with demo content.',
    'site.city': CITY,
    'site.country': COUNTRY,
    'moderation.disclaimer':
      'Community content is shared in good faith and is not professional medical, legal or financial advice.',
    'seed.version': '1',
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  /* ----------------------------------------------------------- categories */

  const categories: [string, string, string][] = [
    ['help', 'education', 'Education'],
    ['help', 'technology', 'Technology'],
    ['help', 'jobs', 'Jobs'],
    ['help', 'health_resources', 'Health resources'],
    ['help', 'legal_information', 'Legal information'],
    ['help', 'household_assistance', 'Household assistance'],
    ['help', 'transportation', 'Transportation'],
    ['help', 'food', 'Food'],
    ['help', 'donations', 'Donations'],
    ['help', 'accessibility', 'Accessibility'],
    ['help', 'finance', 'Finance'],
    ['help', 'local_information', 'Local information'],
    ['help', 'government_services', 'Government services'],
    ['resource', 'hospital', 'Hospital'],
    ['resource', 'clinic', 'Clinic'],
    ['resource', 'pharmacy', 'Pharmacy'],
    ['resource', 'blood_bank', 'Blood bank'],
    ['resource', 'library', 'Library'],
    ['resource', 'school', 'School'],
    ['resource', 'coaching', 'Coaching'],
    ['resource', 'repair', 'Repair'],
    ['resource', 'public_toilet', 'Public toilet'],
    ['resource', 'shelter', 'Shelter'],
    ['resource', 'food_bank', 'Food bank'],
    ['resource', 'government', 'Government office'],
    ['resource', 'emergency', 'Emergency'],
    ['resource', 'restaurant', 'Restaurant'],
    ['resource', 'accessible', 'Accessible place'],
    ['resource', 'donation_center', 'Donation centre'],
    ['resource', 'community_org', 'Community organisation'],
    ['volunteer', 'education', 'Education'],
    ['volunteer', 'health', 'Health'],
    ['volunteer', 'environment', 'Environment'],
    ['volunteer', 'food', 'Food'],
    ['volunteer', 'housing', 'Housing'],
    ['volunteer', 'animals', 'Animals'],
    ['volunteer', 'children', 'Children'],
    ['volunteer', 'elderly', 'Elderly'],
    ['volunteer', 'disaster_relief', 'Disaster relief'],
    ['volunteer', 'accessibility', 'Accessibility'],
    ['volunteer', 'community', 'Community'],
    ['student', 'maths', 'Mathematics'],
    ['student', 'physics', 'Physics'],
    ['student', 'electronics', 'Electronics'],
    ['student', 'programming', 'Programming'],
    ['student', 'languages', 'Languages'],
  ];
  for (const [kind, key, label] of categories) {
    await db.category.create({ data: { kind, key, label } });
  }

  /* ------------------------------------------------------ emergency data */

  const emergencyNumbers: [string, string, string, string | null, string][] = [
    ['India', 'general', '112', null, 'National emergency number (all services)'],
    ['India', 'police', '100', null, 'Police'],
    ['India', 'ambulance', '108', null, 'Ambulance'],
    ['India', 'fire', '101', null, 'Fire service'],
    ['India', 'women_helpline', '1091', null, 'Women helpline'],
    ['India', 'child_helpline', '1098', null, 'Child helpline'],
    ['India', 'disaster', '1078', null, 'Disaster management'],
    ['United States', 'general', '911', null, 'Emergency services'],
    ['United Kingdom', 'general', '999', null, 'Emergency services'],
    ['European Union', 'general', '112', null, 'European emergency number'],
  ];
  for (const [country, service, number, region, notes] of emergencyNumbers) {
    await db.emergencyNumber.create({
      data: { country, service, number, region, notes, source: 'Demo data - verify with official sources', verified: true },
    });
  }

  const guides = [
    {
      slug: 'first-aid-basics',
      kind: 'first_aid',
      title: 'First aid basics (demo guide)',
      body:
        '1. Check the scene is safe before you help.\n2. Check responsiveness and breathing.\n3. Call your local emergency number and put the phone on speaker.\n4. For heavy bleeding, press firmly with a clean cloth and keep pressing.\n5. For burns, cool with running water for 20 minutes. Do not use ice.\n6. Do not move someone with a possible neck or back injury unless they are in danger.\n\nThis guide is general information, not medical advice, and does not replace training or professional care.',
    },
    {
      slug: 'earthquake-safety',
      kind: 'disaster',
      title: 'Earthquake safety (demo guide)',
      body:
        'Drop, cover and hold on. Stay away from windows. If you are outside, move to open ground. After the shaking stops, check for gas leaks and use stairs, not lifts. Keep a torch, water and a whistle somewhere easy to reach.\n\nFollow instructions from local authorities. OpenHub does not replace official emergency services.',
    },
    {
      slug: 'flood-safety',
      kind: 'disaster',
      title: 'Flood safety (demo guide)',
      body:
        'Move to higher ground. Do not walk or drive through moving water. Switch off electricity at the main switch if it is safe to do so. Keep documents in a sealed plastic bag.',
    },
    {
      slug: 'heat-stroke',
      kind: 'health',
      title: 'Heat exhaustion and heat stroke (demo guide)',
      body:
        'Move the person to shade, loosen clothing, cool with wet cloths and give small sips of water if they are fully awake. If they are confused, fainting or not sweating in extreme heat, treat it as heat stroke and call emergency services immediately.\n\nGeneral information only - not medical advice.',
    },
    {
      slug: 'reporting-missing-persons',
      kind: 'safety',
      title: 'Reporting a missing person (demo guide)',
      body:
        'Contact your local police first - in India you can dial 112. Keep a recent photo, note what they were wearing and where they were last seen. Share details on OpenHub only with the family\'s permission.',
    },
  ];
  for (const guide of guides) await db.guide.create({ data: { ...guide, locale: 'en', published: true } });

  /* --------------------------------------------------- student resources */

  const subjects = ['maths', 'physics', 'electronics', 'programming', 'languages'];
  const subjectRows: Record<string, string> = {};
  for (const name of subjects) {
    const row = await db.subject.create({ data: { name } });
    subjectRows[name] = row.id;
  }

  const studentResources = [
    {
      title: 'Demo: Calculus notes - limits and continuity',
      subjectId: subjectRows.maths,
      level: 'undergraduate',
      language: 'en',
      difficulty: 'beginner',
      fileType: 'notes',
      institution: 'Demo University',
      tags: 'calculus,limits',
      url: 'https://example.org/demo/calculus-notes',
      description: 'Demo study notes. Replace with your own material - respect copyright and only upload work you have the right to share.',
    },
    {
      title: 'Demo: Digital electronics - Karnaugh map worked examples',
      subjectId: subjectRows.electronics,
      level: 'undergraduate',
      language: 'en',
      difficulty: 'intermediate',
      fileType: 'pdf',
      institution: 'Demo Polytechnic',
      tags: 'kmap,digital',
      url: 'https://example.org/demo/kmap-examples',
      description: 'Demo resource showing how file type and difficulty filters work.',
    },
    {
      title: 'Demo: Python for beginners (Hindi)',
      subjectId: subjectRows.programming,
      level: 'highschool',
      language: 'hi',
      difficulty: 'beginner',
      fileType: 'video',
      institution: 'Demo Community Class',
      tags: 'python,beginner',
      url: 'https://example.org/demo/python-hindi',
      description: 'Demo resource in Hindi to exercise the language filter.',
    },
    {
      title: 'Demo: Physics previous year questions with solutions',
      subjectId: subjectRows.physics,
      level: 'highschool',
      language: 'en',
      difficulty: 'advanced',
      fileType: 'pdf',
      institution: 'Demo Board',
      tags: 'physics,exam',
      url: 'https://example.org/demo/physics-pyq',
      description: 'Demo exam practice set.',
    },
  ];
  for (const resource of studentResources) {
    await db.studentResource.create({ data: { ...resource, uploaderId: priya.id, verified: true, downloads: 0 } });
  }

  const deck = await db.flashcardDeck.create({
    data: { ownerId: priya.id, name: 'Demo: Electronics formulas', description: 'A few demo cards.', subjectId: subjectRows.electronics },
  });
  const cards: [string, string][] = [
    ["Ohm's law", 'V = I × R'],
    ['Power in a resistor', 'P = V × I = I² × R'],
    ['Capacitor energy', 'E = ½ C V²'],
    ['Inductor energy', 'E = ½ L I²'],
  ];
  for (const [front, back] of cards) {
    await db.flashcard.create({ data: { deckId: deck.id, ownerId: priya.id, front, back } });
  }

  await db.assignment.create({
    data: {
      ownerId: priya.id,
      subjectId: subjectRows.electronics,
      title: 'Demo: Submit microcontroller lab report',
      description: 'Demo assignment.',
      dueAt: new Date(Date.now() + 3 * DAY),
      status: 'in_progress',
      weightPct: 20,
    },
  });
  await db.exam.create({
    data: { ownerId: priya.id, subjectId: subjectRows.electronics, title: 'Demo: Digital electronics semester exam', examAt: new Date(Date.now() + 21 * DAY), location: 'Demo University, Hall B' },
  });
  const timetable = [
    [1, 'Signals and systems', 9, 10],
    [1, 'Microcontrollers lab', 11, 13],
    [2, 'Mathematics III', 9, 10],
    [3, 'Digital electronics', 10, 11],
    [4, 'Embedded systems', 14, 15],
  ] as const;
  for (const [dayOfWeek, title, start, end] of timetable) {
    await db.timetableSlot.create({
      data: {
        ownerId: priya.id,
        title,
        dayOfWeek,
        startTime: `${String(start).padStart(2, '0')}:00`,
        endTime: `${String(end).padStart(2, '0')}:00`,
        room: 'Demo room',
      },
    });
  }
  await db.courseGrade.create({ data: { ownerId: priya.id, title: 'Digital electronics', credits: 4, gradePoint: 9, term: 'Sem 5' } });
  await db.courseGrade.create({ data: { ownerId: priya.id, title: 'Mathematics III', credits: 3, gradePoint: 8, term: 'Sem 5' } });

  await db.listing.create({
    data: {
      kind: 'scholarship',
      title: 'Demo: Merit scholarship for engineering students',
      description: 'Demo scholarship listing. Apply on the official website - always verify before sharing documents.',
      url: 'https://example.org/demo/scholarship',
      deadline: new Date(Date.now() + 30 * DAY),
      createdById: admin.id,
      verified: true,
      published: true,
      location: COUNTRY,
      country: COUNTRY,
    },
  });
  await db.listing.create({
    data: {
      kind: 'internship',
      title: 'Demo: Summer internship - embedded systems',
      description: 'Demo internship listing with a placeholder link.',
      url: 'https://example.org/demo/internship',
      deadline: new Date(Date.now() + 45 * DAY),
      createdById: rahul.id,
      verified: false,
      published: true,
      location: CITY,
      country: COUNTRY,
    },
  });

  /* -------------------------------------------------------- skill exchange */

  const skills = ['electronics-repair', 'python-basics', 'spoken-english', 'bicycle-repair', 'tax-basics'];
  const skillRows: Record<string, string> = {};
  for (const slug of skills) {
    const row = await db.skill.create({ data: { name: slug.replaceAll('-', ' '), slug } });
    skillRows[slug] = row.id;
  }

  const repairOffer = await db.skillOffer.create({
    data: {
      userId: rahul.id,
      skillId: skillRows['electronics-repair'],
      format: 'inperson',
      level: 'advanced',
      priceMode: 'exchange',
      priceCents: 0,
      city: CITY,
      country: COUNTRY,
      availability: 'Saturdays 10:00-13:00',
      description: 'Demo offer: I can teach basic electronics repair at the community workshop on Saturdays.',
    },
  });
  await db.skillOffer.create({
    data: {
      userId: priya.id,
      skillId: skillRows['python-basics'],
      format: 'online',
      level: 'intermediate',
      priceMode: 'free',
      priceCents: 0,
      city: CITY,
      country: COUNTRY,
      availability: 'Weekday evenings',
      description: 'Demo offer: happy to run a free online Python basics session for school students.',
    },
  });
  const englishRequest = await db.skillRequest.create({
    data: {
      userId: rahul.id,
      skillId: skillRows['spoken-english'],
      format: 'online',
      level: 'beginner',
      city: CITY,
      country: COUNTRY,
      availability: 'Tue and Thu evenings',
      description: 'Demo request: looking for spoken English practice twice a week.',
    },
  });

  const connection = await db.skillConnection.create({
    data: {
      offerId: repairOffer.id,
      fromUserId: priya.id,
      toUserId: rahul.id,
      message: 'Demo connect request: can I join the Saturday session?',
      status: 'accepted',
      meetingAt: new Date(Date.now() + 5 * DAY),
      meetingNote: 'Demo meeting note: community hall, bring a multimeter if you have one.',
    },
  });
  await db.skillReview.create({
    data: { connectionId: connection.id, reviewerId: priya.id, revieweeId: rahul.id, rating: 5, comment: 'Demo review: patient teacher, very practical examples.' },
  });

  /* -------------------------------------------------------- local resources */

  const localResources = [
    {
      name: 'Demo City Hospital',
      category: 'hospital',
      address: '12 Demo Road',
      city: CITY,
      country: COUNTRY,
      phone: '+91-20-0000-0000',
      latitude: 18.5204,
      longitude: 73.8567,
      accessibility: 'step_free',
      priceLevel: 2,
      verified: true,
      openingHours: openingHours('00:00', '23:59'),
      description: 'Demo entry - 24x7 emergency department.',
    },
    {
      name: 'Demo Blood Bank',
      category: 'blood_bank',
      address: '4 Demo Street',
      city: CITY,
      country: COUNTRY,
      phone: '+91-20-0000-0001',
      latitude: 18.5304,
      longitude: 73.8467,
      accessibility: 'step_free',
      priceLevel: 1,
      verified: true,
      openingHours: openingHours('09:00', '18:00'),
      description: 'Demo entry - call before travelling to confirm stock.',
    },
    {
      name: 'Demo Public Library',
      category: 'library',
      address: '9 Reader Lane',
      city: CITY,
      country: COUNTRY,
      latitude: 18.5104,
      longitude: 73.8667,
      accessibility: 'unknown',
      priceLevel: 0,
      verified: false,
      openingHours: openingHours('10:00', '19:00'),
      description: 'Demo entry - free reading room and study desks.',
    },
    {
      name: 'Demo Community Kitchen',
      category: 'food_bank',
      address: '3 Share Road',
      city: CITY,
      country: COUNTRY,
      latitude: 18.5404,
      longitude: 73.8367,
      accessibility: 'steps',
      priceLevel: 0,
      verified: true,
      openingHours: openingHours('12:00', '15:00'),
      description: 'Demo entry - free meals, volunteers welcome.',
    },
    {
      name: 'Demo Repair Workshop',
      category: 'repair',
      address: '21 Fixer Street',
      city: CITY,
      country: COUNTRY,
      phone: '+91-20-0000-0002',
      latitude: 18.5004,
      longitude: 73.8767,
      accessibility: 'step_free',
      priceLevel: 1,
      verified: false,
      openingHours: openingHours('10:00', '20:00'),
      description: 'Demo entry - appliance and bicycle repairs.',
    },
    {
      name: 'Demo Government Service Centre',
      category: 'government',
      address: '1 Civic Square',
      city: CITY,
      country: COUNTRY,
      latitude: 18.5604,
      longitude: 73.8067,
      accessibility: 'step_free',
      priceLevel: 0,
      verified: true,
      openingHours: openingHours('10:00', '17:00'),
      description: 'Demo entry - documents, certificates and scheme information.',
    },
  ];
  const resourceRows: Record<string, string> = {};
  for (const resource of localResources) {
    const row = await db.localResource.create({
      data: { ...resource, submittedById: rahul.id, status: 'active', verifiedAt: resource.verified ? new Date() : null },
    });
    resourceRows[resource.name] = row.id;
  }

  await db.resourceReview.create({
    data: { resourceId: resourceRows['Demo Public Library'], authorId: priya.id, rating: 5, comment: 'Demo review: quiet, well lit, and the staff are helpful.' },
  });
  await db.resourceEditSuggestion.create({
    data: {
      resourceId: resourceRows['Demo Repair Workshop'],
      suggestedById: priya.id,
      field: 'openingHours',
      currentValue: 'Mon-Sat 10:00-20:00',
      proposedValue: 'Mon-Sat 10:00-19:00',
      note: 'Demo suggestion: closes an hour early now.',
      status: 'pending',
    },
  });

  /* ------------------------------------------------- volunteer + donations */

  const cleanUp = await db.volunteerOpportunity.create({
    data: {
      organizerId: rahul.id,
      organizationName: 'Demo Neighbourhood Group',
      title: 'Demo: Neighbourhood clean-up drive',
      description: 'Demo opportunity. Meet at the community hall, bring gloves. Volunteers of all ages welcome.',
      cause: 'environment',
      city: CITY,
      country: COUNTRY,
      skillsNeeded: 'none - just bring gloves',
      itemsNeeded: 'gloves, bags',
      startsAt: new Date(Date.now() + 6 * DAY),
      volunteersNeeded: 25,
      status: 'open',
      verified: true,
    },
  });
  await db.volunteerOpportunity.create({
    data: {
      organizerId: priya.id,
      organizationName: 'Demo School',
      title: 'Demo: Weekend coding class for school students',
      description: 'Demo opportunity. Teach basic programming to class 8-10 students for two hours.',
      cause: 'education',
      city: CITY,
      country: COUNTRY,
      skillsNeeded: 'basic programming',
      startsAt: new Date(Date.now() + 9 * DAY),
      volunteersNeeded: 6,
      status: 'open',
      verified: false,
    },
  });
  await db.volunteerSignup.create({
    data: { opportunityId: cleanUp.id, userId: priya.id, message: 'Demo signup: I can bring two extra pairs of gloves.', status: 'confirmed' },
  });

  const campaign = await db.donationCampaign.create({
    data: {
      organizerId: rahul.id,
      title: 'Demo: Winter blankets for the night shelter',
      description:
        'Demo campaign. This is example content - OpenHub does not process payments. Always verify an organisation before sending money or goods.',
      cause: 'housing',
      kind: 'goods',
      goalCents: 10000000,
      raisedCents: 350000,
      itemsNeeded: '100 wool blankets',
      city: CITY,
      country: COUNTRY,
      status: 'open',
      verified: true,
      deadline: new Date(Date.now() + 40 * DAY),
    },
  });
  await db.campaignUpdate.create({
    data: { campaignId: campaign.id, authorId: rahul.id, title: 'Demo update: 40 blankets collected', body: 'Demo update body. Distribution starts next week.' },
  });

  await db.bloodDonorProfile.create({
    data: { userId: rahul.id, bloodGroup: 'O+', city: CITY, country: COUNTRY, lastDonatedAt: new Date(Date.now() - 90 * DAY), available: true, contactPreference: 'message' },
  });
  await db.bloodDonorProfile.create({
    data: { userId: priya.id, bloodGroup: 'B+', city: CITY, country: COUNTRY, lastDonatedAt: new Date(Date.now() - 200 * DAY), available: true, contactPreference: 'message' },
  });
  await db.emergencyContact.create({ data: { userId: priya.id, name: 'Demo family contact', phone: '+91-00000-00000', relation: 'family', isPrimary: true } });
  await db.missingPerson.create({
    data: {
      reportedById: admin.id,
      name: 'Demo missing person report',
      age: 72,
      lastSeenAt: new Date(Date.now() - DAY),
      lastSeenLocation: 'Demo bus stop',
      description: 'Demo record used to show the missing persons board. Always contact official services first.',
      contactNote: 'Contact the demo family through OpenHub messages.',
      status: 'searching',
      verified: false,
    },
  });

  /* ----------------------------------------------------------- help posts */

  const helpPosts = [
    {
      authorId: priya.id,
      title: 'Demo: Where can I get an income certificate renewed?',
      body: 'Demo question. Which office handles income certificate renewals and what documents should I carry? Please share timings too.',
      category: 'government_services',
      kind: 'question',
      urgency: 'normal',
      visibility: 'public',
      status: 'solved',
      tags: 'certificate,government',
    },
    {
      authorId: priya.id,
      title: 'Demo: Looking for second-hand textbooks (electronics)',
      body: 'Demo request. Any senior students selling digital electronics and microcontroller books in good condition?',
      category: 'education',
      kind: 'request',
      urgency: 'normal',
      visibility: 'public',
      status: 'open',
      tags: 'books,electronics',
    },
    {
      authorId: rahul.id,
      title: 'Demo: Free bicycle repair this Saturday',
      body: 'Demo offer. I will repair bicycles for free at the community hall on Saturday morning. Drop by between 10 and 1.',
      category: 'transportation',
      kind: 'offer',
      urgency: 'low',
      visibility: 'public',
      status: 'open',
      tags: 'bicycle,repair',
    },
    {
      authorId: rahul.id,
      title: 'Demo: Urgent - oxygen concentrator needed tonight',
      body: 'Demo post marked urgent to show how urgency filtering works. Please contact the family through OpenHub messages only.',
      category: 'health_resources',
      kind: 'request',
      urgency: 'urgent',
      visibility: 'public',
      status: 'open',
      tags: 'health,urgent',
    },
    {
      authorId: priya.id,
      title: 'Demo: Private request - help moving furniture',
      body: 'Demo private request. Visible only to its author and to moderators, never in public search.',
      category: 'household_assistance',
      kind: 'request',
      urgency: 'high',
      visibility: 'private',
      status: 'open',
      tags: 'moving',
    },
    {
      authorId: admin.id,
      title: 'Demo: Community notice - water supply maintenance',
      body: 'Demo announcement posted by the admin account to show staff content in the feed.',
      category: 'local_information',
      kind: 'question',
      urgency: 'normal',
      visibility: 'public',
      status: 'open',
      tags: 'notice',
    },
  ];
  const helpRows: Record<string, string> = {};
  for (const post of helpPosts) {
    const row = await db.helpRequest.create({ data: { ...post, city: CITY, country: COUNTRY } });
    helpRows[post.title] = row.id;
  }

  const solvedId = helpRows['Demo: Where can I get an income certificate renewed?'];
  const accepted = await db.helpResponse.create({
    data: {
      requestId: solvedId,
      authorId: rahul.id,
      isAccepted: true,
      body: 'Demo answer: the service centre on Civic Square handles renewals, 10:00-17:00, Monday to Friday. Carry ID proof, address proof and last year\'s certificate.',
    },
  });
  await db.helpResponse.create({
    data: { requestId: solvedId, authorId: admin.id, body: 'Demo answer: you can also start the process online on the official state portal.' },
  });
  await db.helpRequest.update({ where: { id: solvedId }, data: { status: 'solved', acceptedResponseId: accepted.id } });

  await db.helpResponse.create({
    data: { requestId: helpRows['Demo: Looking for second-hand textbooks (electronics)'], authorId: rahul.id, body: 'Demo answer: I have a digital electronics book from 2022, message me.' },
  });
  const flagged = await db.helpResponse.create({
    data: {
      requestId: helpRows['Demo: Urgent - oxygen concentrator needed tonight'],
      authorId: admin.id,
      body: 'Demo response flagged for moderation: it links to an unverified supplier.',
    },
  });

  await db.comment.create({ data: { targetType: 'help_request', targetId: solvedId, authorId: priya.id, body: 'Demo comment: thank you, that worked.' } });
  await db.vote.create({ data: { targetType: 'help_request', targetId: solvedId, userId: rahul.id, value: 1 } });
  await db.vote.create({ data: { targetType: 'help_response', targetId: accepted.id, userId: priya.id, value: 1 } });
  await db.savedItem.create({ data: { userId: priya.id, targetType: 'help_request', targetId: helpRows['Demo: Free bicycle repair this Saturday'], note: 'Demo saved item' } });

  /* --------------------------------------------------------------- groups */

  const family = await db.group.create({
    data: {
      name: 'Demo Family Group',
      slug: 'demo-family',
      description: 'Demo private group for a household - shared tasks, shopping list and calendar.',
      kind: 'family',
      visibility: 'private',
      ownerId: priya.id,
      members: {
        create: [
          { userId: priya.id, role: 'owner' },
          { userId: rahul.id, role: 'admin' },
        ],
      },
    },
  });
  const neighbourhood = await db.group.create({
    data: {
      name: 'Demo Neighbourhood Group',
      slug: 'demo-neighbourhood',
      description: 'Demo public group for the area - announcements, clean-ups and local notices.',
      kind: 'neighborhood',
      visibility: 'public',
      ownerId: rahul.id,
      members: {
        create: [
          { userId: rahul.id, role: 'owner' },
          { userId: priya.id, role: 'member' },
          { userId: admin.id, role: 'moderator' },
        ],
      },
    },
  });

  await db.groupPost.create({
    data: { groupId: neighbourhood.id, authorId: rahul.id, title: 'Demo announcement: clean-up drive on Saturday', body: 'Demo body. Meet at the community hall at 9am. Gloves and bags provided.', kind: 'announcement', pinned: true },
  });
  await db.groupPost.create({
    data: { groupId: family.id, authorId: priya.id, title: 'Demo: groceries for the week', body: 'Demo body. Please add anything you need to the shared list.', kind: 'post' },
  });
  await db.groupJoinRequest.create({ data: { groupId: neighbourhood.id, userId: admin.id, message: 'Demo join request left in the approved state.', status: 'approved', reviewedById: rahul.id } });

  const poll = await db.poll.create({
    data: { groupId: neighbourhood.id, authorId: rahul.id, question: 'Demo poll: which day works for the clean-up drive?', closesAt: new Date(Date.now() + 5 * DAY) },
  });
  for (const [position, label] of ['Saturday morning', 'Sunday morning', 'Weekday evening'].entries()) {
    await db.pollOption.create({ data: { pollId: poll.id, label, position } });
  }

  for (const [label, quantity] of [['Milk', '2 L'], ['Rice', '5 kg'], ['Onions', '1 kg']] as [string, string][]) {
    await db.shoppingItem.create({ data: { groupId: family.id, label, quantity, addedById: priya.id } });
  }

  /* --------------------------------------------------------- productivity */

  const task1 = await db.task.create({
    data: { ownerId: priya.id, title: 'Demo: Finish lab report', priority: 'high', dueAt: new Date(Date.now() + 2 * DAY), labels: 'study,electronics', recurrence: 'none' },
  });
  await db.subtask.create({ data: { taskId: task1.id, ownerId: priya.id, title: 'Demo subtask: draw the circuit diagram' } });
  await db.subtask.create({ data: { taskId: task1.id, ownerId: priya.id, title: 'Demo subtask: write observations' } });
  await db.task.create({ data: { ownerId: priya.id, title: 'Demo: Pay electricity bill', priority: 'urgent', dueAt: new Date(Date.now() - DAY), labels: 'bills' } });
  await db.task.create({ data: { ownerId: rahul.id, title: 'Demo: Order spare parts for the workshop', priority: 'medium', dueAt: new Date(Date.now() + 4 * DAY), labels: 'business' } });
  await db.task.create({ data: { ownerId: rahul.id, title: 'Demo: Shared task - arrange clean-up permits', priority: 'high', dueAt: new Date(Date.now() + 3 * DAY), labels: 'group', groupId: neighbourhood.id, assigneeId: priya.id } });

  await db.note.create({
    data: { ownerId: priya.id, title: 'Demo note: scholarship checklist', body: '1. Marksheets\n2. Income certificate\n3. Recommendation letter\n4. Bank details\n\nDemo content.', tags: 'study,scholarship', pinned: true },
  });

  const habit = await db.habit.create({ data: { ownerId: priya.id, title: 'Demo habit: study 1 hour', description: 'Demo habit with a streak.', frequency: 'daily', targetCount: 5 } });
  for (let i = 6; i >= 0; i -= 1) {
    if (i % 2 === 0) await db.habitLog.create({ data: { habitId: habit.id, day: dayKey(i), count: 1 } });
  }

  await db.bookmark.create({
    data: { ownerId: priya.id, url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', title: 'Demo bookmark: JavaScript docs', category: 'programming', tags: 'programming,docs', favorite: true, description: 'Demo bookmark.' },
  });

  await db.calendarEvent.create({
    data: { ownerId: priya.id, title: 'Demo: Semester exam', startsAt: new Date(Date.now() + 21 * DAY), endsAt: new Date(Date.now() + 21 * DAY + 3 * 3_600_000), location: 'Demo University', reminderMinutes: 60 },
  });
  await db.calendarEvent.create({
    data: { ownerId: rahul.id, title: 'Demo: Clean-up drive', startsAt: new Date(Date.now() + 6 * DAY), endsAt: new Date(Date.now() + 6 * DAY + 3 * 3_600_000), location: 'Demo Community Hall', groupId: neighbourhood.id },
  });

  const expenses = [
    ['food', 45000, 'Demo: weekly groceries'],
    ['transport', 12000, 'Demo: bus pass'],
    ['education', 250000, 'Demo: semester fee'],
    ['utilities', 180000, 'Demo: electricity bill'],
    ['health', 60000, 'Demo: pharmacy'],
  ] as const;
  const sharedExpense = await db.expense.create({
    data: { ownerId: rahul.id, category: 'food', amountCents: 120000, currency: 'INR', description: 'Demo: shared dinner with splits', occurredOn: new Date(), groupId: neighbourhood.id, isShared: true },
  });
  await db.expenseSplit.create({ data: { expenseId: sharedExpense.id, userId: rahul.id, shareCents: 40000, settledAt: new Date() } });
  await db.expenseSplit.create({ data: { expenseId: sharedExpense.id, userId: priya.id, shareCents: 40000 } });
  await db.expenseSplit.create({ data: { expenseId: sharedExpense.id, userId: admin.id, shareCents: 40000 } });
  for (const [category, amountCents, description] of expenses) {
    await db.expense.create({ data: { ownerId: priya.id, category, amountCents, currency: 'INR', description, occurredOn: new Date() } });
  }

  /* ----------------------------------------------------------------- trips */

  const trip = await db.trip.create({
    data: {
      ownerId: priya.id,
      title: 'Demo: Goa weekend trip',
      description: 'Demo trip with shared budget and packing list.',
      destination: 'Goa',
      startsAt: new Date(Date.now() + 30 * DAY),
      endsAt: new Date(Date.now() + 33 * DAY),
      visibility: 'private',
      budgetCents: 900000,
      currency: 'INR',
      importantContacts: 'Demo hostel: +91-00000-00000',
      members: { create: [{ userId: priya.id, role: 'owner' }, { userId: rahul.id, role: 'member' }] },
    },
  });
  await db.itineraryItem.create({ data: { tripId: trip.id, addedById: priya.id, title: 'Demo: Check in to hostel', startsAt: new Date(Date.now() + 30 * DAY), position: 0, location: 'Demo hostel' } });
  await db.itineraryItem.create({ data: { tripId: trip.id, addedById: rahul.id, title: 'Demo: Beach day', startsAt: new Date(Date.now() + 31 * DAY), position: 1 } });
  for (const [label, category] of [['Passport', 'documents'], ['Charger', 'electronics'], ['Sunscreen', 'toiletries']] as [string, string][]) {
    await db.packingItem.create({ data: { tripId: trip.id, addedById: priya.id, label, category } });
  }
  const tripExpense = await db.expense.create({
    data: { ownerId: rahul.id, category: 'travel', amountCents: 240000, currency: 'INR', description: 'Demo: bus tickets for three people', occurredOn: new Date(), tripId: trip.id, isShared: true },
  });
  await db.expenseSplit.create({ data: { expenseId: tripExpense.id, userId: rahul.id, shareCents: 80000, settledAt: new Date() } });
  await db.expenseSplit.create({ data: { expenseId: tripExpense.id, userId: priya.id, shareCents: 80000 } });

  const tripPoll = await db.poll.create({ data: { tripId: trip.id, authorId: priya.id, question: 'Demo trip poll: which beach on day two?' } });
  for (const [position, label] of ['North beach', 'South beach'].entries()) {
    await db.pollOption.create({ data: { pollId: tripPoll.id, label, position } });
  }

  /* -------------------------------------------------------------- business */

  const business = await db.businessProfile.create({
    data: {
      ownerId: rahul.id,
      name: 'Demo Repair Workshop',
      slug: 'demo-repair-workshop',
      description: 'Demo small business profile. Shows invoices, inventory and appointments.',
      address: '21 Fixer Street',
      city: CITY,
      country: COUNTRY,
      phone: '+91-20-0000-0002',
      email: 'rahul@openhub.test',
      currency: 'INR',
      taxRateBp: 1800,
      invoicePrefix: 'DEMO',
      invoiceCounter: 2,
      qrMenuEnabled: true,
      published: true,
    },
  });
  const service = await db.service.create({ data: { businessId: business.id, name: 'Demo: Fan repair', description: 'Demo service.', priceCents: 40000, durationMinutes: 60 } });
  const customer = await db.customer.create({ data: { businessId: business.id, name: 'Demo customer', email: 'customer@openhub.test', notes: 'Demo customer record.' } });
  await db.inventoryItem.create({ data: { businessId: business.id, name: 'Demo: Capacitor 1000uF', sku: 'CAP-1000', quantity: 40, reorderLevel: 10, unitCostCents: 1500, priceCents: 3000 } });
  await db.cannedMessage.create({ data: { businessId: business.id, title: 'Demo: Opening hours', body: 'We are open Monday to Saturday, 10:00-20:00.' } });
  await db.appointment.create({
    data: {
      businessId: business.id,
      clientName: 'Demo customer',
      customerId: customer.id,
      serviceId: service.id,
      startsAt: new Date(Date.now() + 2 * DAY),
      endsAt: new Date(Date.now() + 2 * DAY + 45 * 60_000),
      status: 'scheduled',
    },
  });

  const invoice = await db.invoice.create({
    data: {
      businessId: business.id,
      number: 'DEMO-0001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * DAY),
      customerId: customer.id,
      status: 'sent',
      currency: 'INR',
      taxRateBp: 1800,
      subtotalCents: 40000,
      taxCents: 7200,
      totalCents: 47200,
      notes: 'Demo invoice generated by OpenHub.',
    },
  });
  await db.invoiceItem.create({ data: { invoiceId: invoice.id, description: 'Demo: Fan repair (labour)', quantity: 1, unitPriceCents: 40000, totalCents: 40000 } });
  await db.saleRecord.create({ data: { businessId: business.id, amountCents: 47200, currency: 'INR', notes: 'Demo sale: DEMO-0001 paid', invoiceId: invoice.id, method: 'cash', soldAt: new Date() } });

  /* --------------------------------------------- tags, social, moderation */

  const tagRows: Record<string, string> = {};
  for (const [slug, label] of [['student', 'Student'], ['volunteer', 'Volunteer'], ['organiser', 'Organiser']] as [string, string][]) {
    const row = await db.tag.create({ data: { kind: 'interest', slug, label } });
    tagRows[slug] = row.id;
  }
  await db.userTag.create({ data: { userId: priya.id, tagId: tagRows.student } });
  await db.userTag.create({ data: { userId: rahul.id, tagId: tagRows.volunteer } });
  await db.userTag.create({ data: { userId: rahul.id, tagId: tagRows.organiser } });

  await db.report.create({
    data: { reporterId: priya.id, targetType: 'help_response', targetId: flagged.id, reason: 'scam_or_fraud', details: 'Demo report: unverified supplier link. Please review.', status: 'open' },
  });
  await db.notification.create({
    data: { userId: admin.id, type: 'moderation', title: 'Demo report needs review', body: 'A demo response was reported for scam or fraud.', link: '/admin/moderation' },
  });

  const conversation = await db.conversation.create({ data: { kind: 'direct', title: 'Demo conversation' } });
  await db.conversationParticipant.createMany({
    data: [
      { conversationId: conversation.id, userId: priya.id },
      { conversationId: conversation.id, userId: rahul.id },
    ],
  });
  await db.message.create({ data: { conversationId: conversation.id, senderId: priya.id, body: 'Demo message: is the Saturday repair session still on?' } });
  await db.message.create({ data: { conversationId: conversation.id, senderId: rahul.id, body: 'Demo message: yes, 10am at the community hall.' } });

  await db.activityLog.create({ data: { userId: priya.id, type: 'system', description: 'Demo activity: seeded content created' } });
  await db.auditLog.create({
    data: { actorId: admin.id, actorEmail: admin.email, action: 'seed.run', targetType: 'system', metadata: JSON.stringify({ demo: true }) },
  });

  console.log('Seeded demo data.');
  console.log('');
  console.log(`  Demo accounts (password: ${DEMO_PASSWORD})`);
  console.log('    admin@openhub.test  - administrator (moderation, audit log)');
  console.log('    priya@openhub.test  - student member');
  console.log('    rahul@openhub.test  - organiser / small business');
  console.log('');
  console.log('  All seeded content is demo data. Replace it before using OpenHub publicly.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb().catch(() => undefined);
  });
