import express from "express";
import { SUPABASE_URL, supabaseServer } from "../supabase.js";
import { db, saveDb } from "../storage.js";

export const router = express.Router();

// ==========================================
// AUTH & USERS (Email-based)
// ==========================================

// Current user simulation / login endpoint
router.post("/api/auth/login", (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    };
    db.users.push(user);
    saveDb();
  } else if (name && user.name !== name) {
    user.name = name;
    saveDb();
  }

  return res.json({ user });
});

router.get("/api/users", (req, res) => {
  res.json({ users: db.users });
});

// Name & 4-Digit PIN Quick Auth (Registration & Login in one smooth flow)
router.post("/api/auth/pin-auth", async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }

  const cleanPin = (pin || "").toString().trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits (e.g. 1234)." });
  }

  const cleanName = name.trim();
  const nameLower = cleanName.toLowerCase();

  if (!db.accounts) db.accounts = [];
  if (!db.users) db.users = [];

  // 1. Check existing local account by name or username
  let existing = db.accounts.find(a =>
    (a.displayName || a.username || "").toLowerCase() === nameLower ||
    (a.username || "").toLowerCase() === nameLower.replace(/[^a-z0-9]/g, '_')
  );

  // 2. Check Supabase app_users table if available
  if (!existing && supabaseServer) {
    try {
      const { data } = await supabaseServer
        .from("app_users")
        .select("*")
        .ilike("display_name", cleanName)
        .maybeSingle();

      if (data) {
        existing = {
          id: data.id,
          username: data.username,
          email: data.email,
          passwordHash: data.password_hash || cleanPin,
          displayName: data.display_name,
          createdAt: data.created_at || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn("Supabase pin-auth lookup error:", err);
    }
  }

  if (existing) {
    // Validate PIN if stored
    if (existing.passwordHash && existing.passwordHash !== cleanPin) {
      return res.status(401).json({ error: "Incorrect 4-digit PIN for this Name. Please enter your correct PIN." });
    }

    // Update passwordHash if missing
    existing.passwordHash = cleanPin;

    const user = {
      id: existing.id,
      email: existing.email || `${nameLower.replace(/[^a-z0-9]/g, '.')}@camper.app`,
      name: existing.displayName || cleanName,
      pin: cleanPin
    };

    // Keep db.users in sync
    const uIdx = db.users.findIndex(u => u.id === user.id);
    if (uIdx >= 0) {
      db.users[uIdx] = { ...db.users[uIdx], ...user };
    } else {
      db.users.push(user);
    }

    saveDb();

    return res.status(200).json({
      success: true,
      user,
      message: `Welcome back, ${user.name}!`
    });
  }

  // 3. Register new user with Name & 4-Digit PIN
  const userId = `usr_${Date.now()}`;
  const generatedEmail = `${nameLower.replace(/[^a-z0-9]/g, '.')}@camper.app`;
  const newAccount = {
    id: userId,
    username: nameLower.replace(/[^a-z0-9]/g, '_'),
    email: generatedEmail,
    pin: cleanPin,
    passwordHash: cleanPin,
    displayName: cleanName,
    createdAt: new Date().toISOString()
  };

  db.accounts.push(newAccount);

  const user = {
    id: userId,
    email: generatedEmail,
    name: cleanName,
    pin: cleanPin
  };

  db.users.push(user);

  if (supabaseServer) {
    try {
      await supabaseServer.from("app_users").upsert({
        id: userId,
        username: newAccount.username,
        email: generatedEmail,
        password_hash: cleanPin,
        display_name: cleanName,
        created_at: newAccount.createdAt
      });
    } catch (err: any) {
      console.warn("Supabase user insert error:", err?.message);
    }
  }

  saveDb();

  return res.status(201).json({
    success: true,
    user,
    message: `Account created! Welcome, ${cleanName}.`
  });
});

router.post("/api/auth/register", async (req, res) => {
  const { username, email, password, displayName } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required." });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  if (!db.accounts) db.accounts = [];

  // Check duplicate
  const existingLocal = db.accounts.find(a => a.username === cleanUsername || a.email === cleanEmail);
  if (existingLocal) {
    return res.status(409).json({ error: "Username or email is already registered." });
  }

  const userId = `usr_${Date.now()}`;
  const accountRecord = {
    id: userId,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: Buffer.from(password).toString("base64"),
    displayName: displayName || username,
    createdAt: new Date().toISOString()
  };

  db.accounts.push(accountRecord);

  // Sync to db.users for immediate persona and friend resolution
  const user = {
    id: userId,
    email: cleanEmail,
    name: displayName || username
  };
  db.users.push(user);

  let isSupabase = false;
  if (supabaseServer) {
    try {
      const { error } = await supabaseServer.from("app_users").insert([{
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        password_hash: accountRecord.passwordHash,
        display_name: user.name,
        created_at: accountRecord.createdAt
      }]);
      if (!error) {
        isSupabase = true;
      } else {
        console.warn("Supabase register error:", error.message);
      }
    } catch (err: any) {
      console.warn("Supabase register exception:", err.message);
    }
  }

  saveDb();

  return res.status(201).json({
    success: true,
    user,
    account: { id: userId, username: cleanUsername, email: cleanEmail, displayName: user.name },
    isSupabase,
    message: isSupabase ? "Account created and saved in Supabase!" : "Account created successfully!"
  });
});

// User Login with Username / Password
router.post("/api/auth/login-password", async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "Username/email and password are required." });
  }

  const cleanInput = usernameOrEmail.trim().toLowerCase();
  const pwdHash = Buffer.from(password).toString("base64");

  if (!db.accounts) db.accounts = [];

  // Check Supabase first if available
  let userAccount: any = null;
  let isSupabase = false;

  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("app_users")
        .select("*")
        .or(`username.eq.${cleanInput},email.eq.${cleanInput}`)
        .single();

      if (!error && data) {
        if (data.password_hash === pwdHash) {
          userAccount = {
            id: data.id,
            username: data.username,
            email: data.email,
            displayName: data.display_name
          };
          isSupabase = true;
        } else {
          return res.status(401).json({ error: "Invalid password." });
        }
      }
    } catch (err) {
      console.warn("Supabase query error:", err);
    }
  }

  // Fallback to local accounts
  if (!userAccount) {
    const local = db.accounts.find(a => (a.username === cleanInput || a.email === cleanInput));
    if (local) {
      if (local.passwordHash !== pwdHash) {
        return res.status(401).json({ error: "Invalid password." });
      }
      userAccount = {
        id: local.id,
        username: local.username,
        email: local.email,
        displayName: local.displayName
      };
    } else {
      // Check seeded demo users
      const demoUser = db.users.find(u => u.email.toLowerCase() === cleanInput || u.name.toLowerCase().includes(cleanInput));
      if (demoUser) {
        userAccount = {
          id: demoUser.id,
          username: demoUser.email.split('@')[0],
          email: demoUser.email,
          displayName: demoUser.name
        };
      } else {
        return res.status(404).json({ error: "Account not found. Please create an account." });
      }
    }
  }

  const user = {
    id: userAccount.id,
    email: userAccount.email,
    name: userAccount.displayName || userAccount.username
  };

  // Ensure in db.users
  if (!db.users.some(u => u.id === user.id)) {
    db.users.push(user);
    saveDb();
  }

  return res.json({
    success: true,
    user,
    account: userAccount,
    isSupabase,
    message: isSupabase ? "Signed in with Supabase credentials!" : "Signed in successfully!"
  });
});

// System Auth & Services Status
router.get("/api/auth/status", (req, res) => {
  return res.json({
    supabaseConfigured: Boolean(supabaseServer),
    supabaseUrl: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 22)}...` : null,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
  });
});

// Real-time Supabase Database Table Verification
