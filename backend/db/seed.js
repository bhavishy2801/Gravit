import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { generatePseudonym } from '../services/pseudonym.js';

const { Pool } = pg;

/**
 * Seed the database using an existing pool (called from server startup).
 * Only inserts rows that don't already exist (ON CONFLICT DO NOTHING).
 */
export async function seedIfEmpty(pool) {
  try {
    // Quick check — if institution already exists, skip heavy seeding
    const check = await pool.query("SELECT id FROM institutions WHERE domain = 'iitj.ac.in'");
    if (check.rows.length > 0) {
      console.log('✅ Seed data already present — skipping');
      return;
    }

    console.log('🌱 Seeding database...');
    await runSeed(pool);
    console.log('🎉 Seed complete!');
  } catch (err) {
    console.error('❌ Seed check failed:', err.message);
    // Non-fatal — server can still start
  }
}

async function runSeed(pool) {
  // ─── Institution ─────────────────────────────
  const salt = process.env.INSTITUTION_SALT || 'gravit-iitj-salt-2026';
  const instResult = await pool.query(`
      INSERT INTO institutions (name, domain, salt)
      VALUES ($1, $2, $3)
      ON CONFLICT (domain) DO UPDATE SET name = $1
      RETURNING id
    `, ['IIT Jodhpur', 'iitj.ac.in', salt]);
  const institutionId = instResult.rows[0].id;
  console.log('  ✅ Institution: IIT Jodhpur');

  // ─── Channels ────────────────────────────────
  const channelsData = [
    // Academia
    { id: 'curriculum', name: 'curriculum', category: 'academia', icon: '📚', desc: 'Curriculum & syllabus concerns', sort: 1 },
    { id: 'faculty', name: 'faculty', category: 'academia', icon: '📚', desc: 'Faculty-related issues', sort: 2 },
    { id: 'grading', name: 'grading', category: 'academia', icon: '📚', desc: 'Grading & evaluation', sort: 3 },
    { id: 'exams', name: 'exams', category: 'academia', icon: '📚', desc: 'Examination schedules & issues', sort: 4 },
    // Bureaucracy
    { id: 'fees', name: 'fees', category: 'bureaucracy', icon: '🏛️', desc: 'Fee-related grievances', sort: 5 },
    { id: 'documents', name: 'documents', category: 'bureaucracy', icon: '🏛️', desc: 'Document processing delays', sort: 6 },
    { id: 'registration', name: 'registration', category: 'bureaucracy', icon: '🏛️', desc: 'Registration issues', sort: 7 },
    // Infrastructure
    { id: 'labs', name: 'labs', category: 'infrastructure', icon: '🏗️', desc: 'Lab equipment & availability', sort: 8 },
    { id: 'hostels', name: 'hostels', category: 'infrastructure', icon: '🏗️', desc: 'Hostel living conditions', sort: 9 },
    { id: 'safety', name: 'safety', category: 'infrastructure', icon: '🏗️', desc: 'Campus safety concerns', sort: 10 },
    { id: 'wifi', name: 'wifi', category: 'infrastructure', icon: '🏗️', desc: 'WiFi & network issues', sort: 11 },
    // Placement
    { id: 'cell', name: 'placement-cell', category: 'placement', icon: '💼', desc: 'Placement cell operations', sort: 12 },
    { id: 'companies', name: 'companies', category: 'placement', icon: '💼', desc: 'Company visit issues', sort: 13 },
    { id: 'internships', name: 'internships', category: 'placement', icon: '💼', desc: 'Internship coordination', sort: 14 },
    // Mess
    { id: 'mess-quality', name: 'food-quality', category: 'mess', icon: '🍽️', desc: 'Food quality complaints', sort: 15 },
    { id: 'mess-hygiene', name: 'hygiene', category: 'mess', icon: '🍽️', desc: 'Mess hygiene issues', sort: 16 },
    { id: 'mess-timing', name: 'timing', category: 'mess', icon: '🍽️', desc: 'Mess timing issues', sort: 17 },
    { id: 'mess-menu', name: 'menu', category: 'mess', icon: '🍽️', desc: 'Menu & dietary concerns', sort: 18 },
    { id: 'mess-billing', name: 'billing', category: 'mess', icon: '🍽️', desc: 'Mess fee & billing issues', sort: 19 },
    { id: 'mess-general', name: 'general', category: 'mess', icon: '🍽️', desc: 'General mess issues', sort: 20 },
  ];

  // ─── Hostel Channels ─────────────────────────
  const hostels = ['B1', 'B2', 'B3', 'B4', 'B5', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'I2', 'I3', 'O3', 'O4', 'Y3', 'Y4'];
  const hostelSubCategories = [
    { suffix: '', label: 'General', desc: 'General hostel issues' },
    { suffix: '-water', label: 'Water', desc: 'Water supply & quality issues' },
    { suffix: '-sanitation', label: 'Sanitation', desc: 'Sanitation & cleanliness issues' },
    { suffix: '-ac', label: 'AC', desc: 'AC repair & maintenance issues' },
    { suffix: '-gym', label: 'Gym', desc: 'Gym equipment & access issues' },
    { suffix: '-misc', label: 'Misc', desc: 'Miscellaneous hostel issues' },
  ];

  let hostelSort = 100;
  for (const h of hostels) {
    const hLower = h.toLowerCase();
    for (const sub of hostelSubCategories) {
      const channelId = `hostel-${hLower}${sub.suffix}`;
      const channelName = sub.suffix ? `${h} ${sub.label}` : `${h} General`;
      channelsData.push({
        id: channelId,
        name: channelName,
        category: `hostel-${hLower}`,
        icon: '🏠',
        desc: `${h} — ${sub.desc}`,
        sort: hostelSort++,
      });
    }
  }

  for (const ch of channelsData) {
    await pool.query(`
        INSERT INTO channels (id, name, category, category_icon, description, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [ch.id, ch.name, ch.category, ch.icon, ch.desc, ch.sort]);
  }
  console.log(`  ✅ ${channelsData.length} channels created (14 base + ${hostels.length * hostelSubCategories.length} hostel)`);

  // ─── Escalation Hierarchy ────────────────────
  // Mirrors services/escalationConfig.js — stored in DB for queries by
  // the authority dashboard + DMS monitor.
  const hierarchyData = [
    // Academia (2 tiers)
    { cat: 'academia', level: 1, role: 'Office of Students', email: 'office_students@iitj.ac.in', hours: 72 },
    { cat: 'academia', level: 2, role: 'Dean of Academic Affairs', email: 'doaa@iitj.ac.in', hours: 0 },
    // Bureaucracy (1 tier)
    { cat: 'bureaucracy', level: 1, role: 'ERP', email: 'erp@iitj.ac.in', hours: 0 },
    // Infrastructure (1 tier)
    { cat: 'infrastructure', level: 1, role: 'OIE', email: 'oie@iitj.ac.in', hours: 0 },
    // Placement (1 tier)
    { cat: 'placement', level: 1, role: 'Placement Office', email: 'placement@iitj.ac.in', hours: 0 },
    // Mess (3 tiers)
    { cat: 'mess', level: 1, role: 'Dining Services', email: 'catering@iitj.ac.in', hours: 72 },
    { cat: 'mess', level: 2, role: 'Board of Hostel Affairs', email: 'bha@iitj.ac.in', hours: 72 },
    { cat: 'mess', level: 3, role: 'Associate Dean Hostel Affairs', email: 'adha@iitj.ac.in', hours: 0 },
  ];

  // Hostel hierarchy for each hostel (3 tiers)
  for (const h of hostels) {
    const hLower2 = h.toLowerCase();
    const hCat = `hostel-${hLower2}`;
    hierarchyData.push(
      { cat: hCat, level: 1, role: `${h} Caretaker`,                   email: `${hLower2}caretaker@iitj.ac.in`,       hours: 96  },   // ~4 days
      { cat: hCat, level: 2, role: `Warden ${h} Hostel`,               email: `warden_${hLower2}_hostel@iitj.ac.in`,  hours: 120 },   // ~5 days
      { cat: hCat, level: 3, role: 'Associate Dean Hostel Affairs',    email: 'adha@iitj.ac.in',                      hours: 0   },   // final
    );
  }

  for (const h of hierarchyData) {
    await pool.query(`
        INSERT INTO escalation_hierarchy (category, level, role_title, contact_email, response_window_hours)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (category, level) DO UPDATE
          SET role_title = $3, contact_email = $4, response_window_hours = $5
      `, [h.cat, h.level, h.role, h.email || null, h.hours]);
  }
  console.log('  ✅ Escalation hierarchy created');

  // ─── Demo Users ──────────────────────────────
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demoUsers = [
    { email: 'student@iitj.ac.in', role: 'student' },
    { email: 'moderator@iitj.ac.in', role: 'moderator' },
    { email: 'admin@iitj.ac.in', role: 'admin' },
    { email: 'caretaker@iitj.ac.in', role: 'authority' },
  ];

  for (const u of demoUsers) {
    const pseudonym = generatePseudonym(u.email, salt);
    await pool.query(`
        INSERT INTO users (email, password_hash, pseudonym, role, institution_id, avatar_hue)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [u.email, demoPassword, pseudonym, u.role, institutionId, Math.floor(Math.random() * 360)]);
  }

  // Assign the demo caretaker to hostel-b1, level 1
  const caretakerResult = await pool.query(
    "SELECT id FROM users WHERE email = 'caretaker@iitj.ac.in'"
  );
  if (caretakerResult.rows.length > 0) {
    await pool.query(`
        INSERT INTO authority_assignments (user_id, category, hierarchy_level)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, category) DO NOTHING
      `, [caretakerResult.rows[0].id, 'hostel-b1', 1]);
  }

  console.log('  ✅ Demo users created (password: demo123)');
  console.log('     student / moderator / admin / caretaker @iitj.ac.in');
}

// ─── Standalone CLI usage: node db/seed.js ──────────
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gravit',
  });
  runSeed(pool)
    .then(() => { console.log('🎉 Seed complete!'); pool.end(); })
    .catch(() => { pool.end(); process.exit(1); });
}
