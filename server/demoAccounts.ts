import { db } from './db.ts';
import { supabaseAdmin } from './supabase.ts';

type DemoAccountRole = 'LEARNER' | 'KNOWLEDGE_SHARER';

interface DemoAccountSeed {
  email: string;
  password: string;
  fullName: string;
  role: DemoAccountRole;
  learnSkills: string[];
  shareSkills: string[];
}

interface RequiredSkill {
  name: string;
  category: string;
}

const requiredSkills: RequiredSkill[] = [
  { name: 'Artificial Intelligence', category: 'Technology' },
  { name: 'Career Skills', category: 'Career Development' },
  { name: 'Deep Learning', category: 'Technology' },
  { name: 'Drawing', category: 'Arts & Crafts' },
  { name: 'Video Editing', category: 'Media & Design' },
  { name: 'Painting', category: 'Arts & Crafts' },
];

const mentorEmail =
  process.env.LEARNX_DEMO_MENTOR_EMAIL ??
  'rathikasris28@gmail.com';
const learnerEmail =
  process.env.LEARNX_DEMO_LEARNER_EMAIL ??
  'r31668797@gmail.com';

function configuredDemoAccounts(): DemoAccountSeed[] {
  const mentorPassword =
    process.env.LEARNX_DEMO_MENTOR_PASSWORD;
  const learnerPassword =
    process.env.LEARNX_DEMO_LEARNER_PASSWORD;
  const additionalAccountsJson =
    process.env.LEARNX_ADDITIONAL_DEMO_ACCOUNTS_JSON;

  if (!mentorPassword && !learnerPassword && !additionalAccountsJson) {
    return [];
  }

  if (!mentorPassword || !learnerPassword) {
    throw new Error(
      'Both LEARNX_DEMO_MENTOR_PASSWORD and LEARNX_DEMO_LEARNER_PASSWORD are required to provision the default demo accounts.',
    );
  }

  const accounts: DemoAccountSeed[] = [
    {
      email: mentorEmail,
      password: mentorPassword,
      fullName: 'Rathika Sri',
      role: 'KNOWLEDGE_SHARER',
      learnSkills: [
        'Artificial Intelligence',
        'Career Skills',
        'Deep Learning',
      ],
      shareSkills: ['Drawing', 'Video Editing', 'Painting'],
    },
    {
      email: learnerEmail,
      password: learnerPassword,
      fullName: 'Ram',
      role: 'LEARNER',
      learnSkills: ['Drawing', 'Video Editing', 'Painting'],
      shareSkills: [
        'Artificial Intelligence',
        'Career Skills',
        'Deep Learning',
      ],
    },
  ];

  if (additionalAccountsJson) {
    let additionalAccounts: unknown;

    try {
      additionalAccounts = JSON.parse(additionalAccountsJson);
    } catch {
      throw new Error(
        'LEARNX_ADDITIONAL_DEMO_ACCOUNTS_JSON must be a valid JSON array.',
      );
    }

    if (
      !Array.isArray(additionalAccounts) ||
      !additionalAccounts.every(isAdditionalAccount)
    ) {
      throw new Error(
        'LEARNX_ADDITIONAL_DEMO_ACCOUNTS_JSON contains an invalid account definition.',
      );
    }

    accounts.push(
      ...additionalAccounts.map((account) => ({
        ...account,
        role:
          account.role === 'MENTOR'
            ? 'KNOWLEDGE_SHARER'
            : account.role,
      })),
    );
  }

  const emails = new Set<string>();

  for (const account of accounts) {
    const normalizedEmail = account.email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      emails.has(normalizedEmail)
    ) {
      throw new Error(
        'Demo account emails must be valid and unique.',
      );
    }

    if (account.password.length < 8) {
      throw new Error(
        'Demo account passwords must contain at least 8 characters.',
      );
    }

    if (
      account.role === 'KNOWLEDGE_SHARER' &&
      account.shareSkills.length === 0
    ) {
      throw new Error(
        'Every demo knowledge sharer must have at least one sharing skill.',
      );
    }

    emails.add(normalizedEmail);
  }

  return accounts;
}

type AdditionalDemoAccount = Omit<DemoAccountSeed, 'role'> & {
  role: DemoAccountRole | 'MENTOR';
};

function isAdditionalAccount(
  value: unknown,
): value is AdditionalDemoAccount {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const account = value as Record<string, unknown>;
  return (
    typeof account.email === 'string' &&
    typeof account.password === 'string' &&
    typeof account.fullName === 'string' &&
    account.fullName.trim().length > 0 &&
    (account.role === 'LEARNER' ||
      account.role === 'KNOWLEDGE_SHARER' ||
      account.role === 'MENTOR') &&
    Array.isArray(account.learnSkills) &&
    account.learnSkills.every((skill) => typeof skill === 'string') &&
    Array.isArray(account.shareSkills) &&
    account.shareSkills.every((skill) => typeof skill === 'string')
  );
}

async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  const perPage = 1000;

  for (let page = 1; ; page++) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw new Error(
        `Unable to find configured demo account: ${error.message}`,
      );
    }

    const user = data.users.find(
      (candidate) =>
        candidate.email?.toLowerCase() === normalizedEmail,
    );

    if (user) {
      return user;
    }

    if (data.users.length < perPage) {
      return null;
    }
  }
}

async function ensureAuthAccount(account: DemoAccountSeed) {
  const email = account.email.trim().toLowerCase();
  const metadata = {
    full_name: account.fullName,
    role: account.role,
    preferred_language: 'English',
    bio: 'LearnX demonstration account.',
    onboarding_completed: true,
    is_active: true,
    is_demo_account: true,
  };

  const existingUser = await findAuthUserByEmail(email);

  if (existingUser) {
    const { data, error } =
      await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata ?? {}),
            ...metadata,
          },
        },
      );

    if (error || !data.user) {
      throw new Error(
        'Unable to update configured demo account in Supabase Auth.',
      );
    }

    return { user: data.user };
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: account.password,
      email_confirm: true,
      user_metadata: metadata,
    });

  if (error || !data.user) {
    throw new Error(
      'Unable to create configured demo account in Supabase Auth.',
    );
  }

  return { user: data.user };
}

async function ensureSkill(name: string) {
  const skill = await db.skill.upsert({
    where: { name },
    create: {
      name,
      category:
        requiredSkills.find((item) => item.name === name)?.category ??
        'General',
      description: null,
    },
    update: { isActive: true },
  });

  return skill;
}

async function persistDemoProfile(
  account: DemoAccountSeed,
  userId: string,
) {
  const skills = new Map(
    await Promise.all(
      [...new Set([...account.learnSkills, ...account.shareSkills])].map(
        async (name) => [name, await ensureSkill(name)] as const,
      ),
    ),
  );

  await db.$transaction(async (tx) => {
    const wallet = await tx.timeCreditWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      const welcomeBonus =
        account.role === 'LEARNER' ? 5 : 0;

      await tx.timeCreditWallet.create({
        data: {
          userId,
          balance: welcomeBonus,
        },
      });

      if (welcomeBonus > 0) {
        await tx.timeCreditTransaction.create({
          data: {
            userId,
            amount: welcomeBonus,
            transactionType: 'ADJUSTMENT',
            description: 'Welcome bonus',
          },
        });
      }
    }

    await tx.userReliability.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    await tx.userAvailability.upsert({
      where: { userId },
      create: {
        userId,
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
      },
      update: { status: 'ACTIVE' },
    });

    for (const name of account.learnSkills) {
      const skill = skills.get(name);

      if (!skill) {
        throw new Error(`Required demo skill was not resolved: ${name}`);
      }

      await tx.userSkill.upsert({
        where: {
          userId_skillId_skillType: {
            userId,
            skillId: skill.id,
            skillType: 'LEARN',
          },
        },
        create: {
          userId,
          skillId: skill.id,
          skillType: 'LEARN',
          skillLevel: 'BEGINNER',
        },
        update: {
          isActive: true,
        },
      });
    }

    for (const name of account.shareSkills) {
      const skill = skills.get(name);

      if (!skill) {
        throw new Error(`Required demo skill was not resolved: ${name}`);
      }

      await tx.userSkill.upsert({
        where: {
          userId_skillId_skillType: {
            userId,
            skillId: skill.id,
            skillType: 'SHARE',
          },
        },
        create: {
          userId,
          skillId: skill.id,
          skillType: 'SHARE',
          skillLevel: 'INTERMEDIATE',
        },
        update: {
          isActive: true,
        },
      });
    }
  });
}

export async function provisionDemoAccounts(): Promise<void> {
  const accounts = configuredDemoAccounts();

  if (accounts.length === 0) {
    return;
  }

  for (const account of accounts) {
    const { user } = await ensureAuthAccount(account);
    await persistDemoProfile(account, user.id);
  }

  console.log(
    `[LearnX] Provisioned ${accounts.length} Supabase demo accounts.`,
  );
}
