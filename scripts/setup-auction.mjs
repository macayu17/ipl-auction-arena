import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUCTION_ADMIN_EMAIL",
  "AUCTION_ADMIN_PASSWORD",
];

const iplTeams = [
  { name: "Mumbai Indians", short_code: "MI" },
  { name: "Chennai Super Kings", short_code: "CSK" },
  { name: "Royal Challengers Bengaluru", short_code: "RCB" },
  { name: "Kolkata Knight Riders", short_code: "KKR" },
  { name: "Sunrisers Hyderabad", short_code: "SRH" },
  { name: "Delhi Capitals", short_code: "DC" },
  { name: "Punjab Kings", short_code: "PBKS" },
  { name: "Rajasthan Royals", short_code: "RR" },
  { name: "Gujarat Titans", short_code: "GT" },
  { name: "Lucknow Super Giants", short_code: "LSG" },
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.AUCTION_ADMIN_EMAIL.toLowerCase();
const adminPassword = process.env.AUCTION_ADMIN_PASSWORD;
const teamEmailDomain = process.env.TEAM_EMAIL_DOMAIN ?? "auction.local";
const teamPasswordPrefix = process.env.TEAM_PASSWORD_PREFIX ?? "Captain";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function teamEmail(shortCode) {
  return `${shortCode.toLowerCase()}@${teamEmailDomain}`.toLowerCase();
}

function teamPassword(shortCode) {
  return `${teamPasswordPrefix}-${shortCode}-2026!`;
}

async function findUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (found) {
      return found;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function ensureUser({ email, password, role, userMetadata, appMetadata }) {
  const existing = await findUserByEmail(email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      ...userMetadata,
      role,
    },
    app_metadata: {
      ...appMetadata,
      role,
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function main() {
  const { data: seededTeams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, short_code");

  if (teamsError) {
    throw teamsError;
  }

  if (!seededTeams || seededTeams.length !== iplTeams.length) {
    throw new Error(
      `Expected ${iplTeams.length} seeded teams in public.teams, found ${seededTeams?.length ?? 0}. Run the SQL migration first.`
    );
  }

  const teamMap = new Map(
    seededTeams.map((team) => [team.short_code.toUpperCase(), team])
  );

  const adminUser = await ensureUser({
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    userMetadata: {
      display_name: "Auction Admin",
    },
    appMetadata: {
      display_name: "Auction Admin",
    },
  });

  console.log(`Admin ready: ${adminUser.email}`);

  for (const team of iplTeams) {
    const seededTeam = teamMap.get(team.short_code);

    if (!seededTeam) {
      throw new Error(`Team not found in database: ${team.short_code}`);
    }

    const email = teamEmail(team.short_code);
    const password = teamPassword(team.short_code);

    const teamUser = await ensureUser({
      email,
      password,
      role: "team",
      userMetadata: {
        team_id: seededTeam.id,
        team_name: seededTeam.name,
        short_code: seededTeam.short_code,
      },
      appMetadata: {
        team_id: seededTeam.id,
        team_name: seededTeam.name,
        short_code: seededTeam.short_code,
      },
    });

    const { error: teamUpdateError } = await supabase
      .from("teams")
      .update({ user_id: teamUser.id })
      .eq("id", seededTeam.id);

    if (teamUpdateError) {
      throw teamUpdateError;
    }

    const { error: credentialError } = await supabase
      .from("team_credentials")
      .upsert(
        {
          team_id: seededTeam.id,
          user_id: teamUser.id,
          login_email: email,
          login_password: password,
        },
        { onConflict: "team_id" }
      );

    if (credentialError) {
      throw credentialError;
    }

    console.log(`Team ready: ${seededTeam.short_code} -> ${email}`);
  }

  const { error: auctionStateError } = await supabase
    .from("auction_state")
    .upsert({ id: 1, bid_increment: 50 }, { onConflict: "id" });

  if (auctionStateError) {
    throw auctionStateError;
  }

  console.log("");
  console.log("Auction bootstrap complete.");
  console.log(`Admin login: ${adminEmail}`);
  console.log("Team logins:");

  for (const team of iplTeams) {
    console.log(`- ${team.short_code}: ${teamEmail(team.short_code)}`);
  }
}

main().catch((error) => {
  console.error("");
  console.error("Auction bootstrap failed.");
  console.error(error);
  process.exit(1);
});
