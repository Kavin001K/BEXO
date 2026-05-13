import { Router } from "express";
import { queryD1, executeD1 } from "../lib/db";
import crypto from "crypto";

const router = Router();

// GET /api/profile/check-handle/:handle
router.get("/check-handle/:handle", async (req, res) => {
  try {
    const { handle } = req.params;
    const profiles = await queryD1("SELECT id FROM profiles WHERE handle = ?", [handle.toLowerCase()]);
    res.json({ available: profiles.length === 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/profile/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profiles = await queryD1("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    
    if (profiles.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = profiles[0];
    const profileId = profile.id;

    const [education, experiences, projects, skills, research] = await Promise.all([
      queryD1("SELECT * FROM education WHERE profile_id = ? ORDER BY start_year DESC", [profileId]),
      queryD1("SELECT * FROM experiences WHERE profile_id = ? ORDER BY start_date DESC", [profileId]),
      queryD1("SELECT * FROM projects WHERE profile_id = ?", [profileId]),
      queryD1("SELECT * FROM skills WHERE profile_id = ?", [profileId]),
      queryD1("SELECT * FROM research WHERE profile_id = ?", [profileId]),
    ]);

    res.json({
      profile,
      education,
      experiences,
      projects,
      skills,
      research,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile
router.post("/", async (req, res) => {
  try {
    const { user_id, handle, full_name, ...rest } = req.body;
    
    // Check if profile exists for this user_id
    const existing = await queryD1("SELECT id FROM profiles WHERE user_id = ?", [user_id]);
    
    if (existing.length > 0) {
      const id = existing[0].id;
      const updates = { handle, full_name, ...rest };
      const keys = Object.keys(updates);
      const setClause = keys.map(k => `${k} = ?`).join(", ");
      const params = [...Object.values(updates), id];
      await executeD1(`UPDATE profiles SET ${setClause} WHERE id = ?`, params);
      res.json({ success: true, id });
      return;
    }

    const id = crypto.randomUUID();
    await executeD1(
      "INSERT INTO profiles (id, user_id, handle, full_name, headline, bio, avatar_url, location, website, linkedin_url, github_url, resume_url, email, phone, is_published, portfolio_theme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        user_id,
        handle,
        full_name,
        rest.headline || "",
        rest.bio || "",
        rest.avatar_url || null,
        rest.location || null,
        rest.website || null,
        rest.linkedin_url || null,
        rest.github_url || null,
        rest.resume_url || null,
        rest.email || null,
        rest.phone || null,
        rest.is_published || false,
        rest.portfolio_theme || "default"
      ]
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// PATCH /api/profile/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      res.status(400).json({ error: "No updates provided" });
      return;
    }

    const setClause = keys.map(k => `${k} = ?`).join(", ");
    const params = [...Object.values(updates), id];

    await executeD1(`UPDATE profiles SET ${setClause} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-resource endpoints (Education, Experience, etc.)
router.post("/:id/education", async (req, res) => {
  try {
    const { id: profileId } = req.params;
    const edu = req.body;
    const id = crypto.randomUUID();
    await executeD1(
      "INSERT INTO education (id, profile_id, institution, degree, field, start_year, end_year, gpa, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, profileId, edu.institution, edu.degree, edu.field, edu.start_year, edu.end_year, edu.gpa, edu.description]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Save
router.post("/:id/bulk/:table", async (req, res) => {
  try {
    const { id: profileId, table } = req.params;
    const items = req.body; // Array of items
    
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "Body must be an array" });
      return;
    }

    // Simple bulk implementation
    for (const item of items) {
      const id = crypto.randomUUID();
      const keys = Object.keys(item).filter(k => k !== 'id');
      const columns = ['id', 'profile_id', ...keys].join(", ");
      const placeholders = ['?', '?', ...keys.map(() => "?")].join(", ");
      const params = [id, profileId, ...keys.map(k => item[k])];
      
      await executeD1(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, params);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
