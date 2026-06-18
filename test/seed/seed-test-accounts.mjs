/* Seed deterministic test accounts (2 per role) + role profiles, idempotently,
   then verify each can log in via the live API. Writes test/accounts.json. */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const DB = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3308),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "manga_root",   // dev default (db/docker-compose.yml)
  database: process.env.DB_NAME || "manga_creation_workflow_and_publishing_management_system",
  charset: "utf8mb4",
};
const API = process.env.API_URL || "http://localhost:3000/api";
const PASSWORD = process.env.TEST_PASSWORD || "Test1234!";

const PLAN = [
  { role: "MANGAKA", n: 2 },
  { role: "ASSISTANT", n: 2 },
  { role: "TANTOU_EDITOR", n: 2 },
  { role: "EDITORIAL_BOARD", n: 2 },
  { role: "ADMIN", n: 2 },
];
const titleCase = (r) => r.split("_").map((s) => s[0] + s.slice(1).toLowerCase()).join(" ");
const accounts = [];
for (const p of PLAN)
  for (let i = 1; i <= p.n; i++)
    accounts.push({ role: p.role, idx: i, email: `${p.role.toLowerCase()}${i}@test.inkframe.studio`, name: `Test ${titleCase(p.role)} ${i}` });

const conn = await mysql.createConnection(DB);
const hash = await bcrypt.hash(PASSWORD, 10);

async function upsertUser(a) {
  const [rows] = await conn.query("SELECT user_id FROM `User` WHERE email = ?", [a.email]);
  if (rows.length) {
    const id = rows[0].user_id;
    await conn.query("UPDATE `User` SET password_hash=?, full_name=?, role=?, auth_provider='LOCAL', is_activated=1 WHERE user_id=?", [hash, a.name, a.role, id]);
    return { id, created: false };
  }
  const [r] = await conn.query("INSERT INTO `User` (email,password_hash,full_name,role,auth_provider,is_activated) VALUES (?,?,?,?,'LOCAL',1)", [a.email, hash, a.name, a.role]);
  return { id: r.insertId, created: true };
}
async function upsertProfile(a) {
  switch (a.role) {
    case "MANGAKA":
      return conn.query("INSERT INTO `Mangaka_Profile` (user_id,pen_name,biography,years_experrence,studio_name) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE pen_name=VALUES(pen_name)", [a.id, `Pen ${a.name}`, "Automated test mangaka", a.idx + 1, "Test Studio"]);
    case "ASSISTANT":
      return conn.query("INSERT INTO `Assistant_Profile` (user_id,salary_rate,skill_set,total_earnings) VALUES (?,?,?,0) ON DUPLICATE KEY UPDATE skill_set=VALUES(skill_set)", [a.id, 50000, "background,effect,character"]);
    case "TANTOU_EDITOR":
      return conn.query("INSERT INTO `Tantou_Editor_Profile` (user_id,department_name,specialization,years_experience,managed_series_count) VALUES (?,?,?,?,0) ON DUPLICATE KEY UPDATE specialization=VALUES(specialization)", [a.id, "Editorial", "Shonen", a.idx + 2]);
    case "EDITORIAL_BOARD":
      return conn.query("INSERT INTO `Editorial_Board_Profile` (user_id,position,seniority_level,voting_power) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE position=VALUES(position)", [a.id, "Board Member", a.idx, 1]);
    default:
      return null; // ADMIN has no profile table
  }
}

let created = 0;
for (const a of accounts) {
  const u = await upsertUser(a);
  a.id = u.id;
  if (u.created) created++;
  await upsertProfile(a);
}

// Seed Task_Price_Rule (one per region type) so task auto-pricing + earnings accrual is exercised
const adminId = accounts.find((a) => a.role === "ADMIN")?.id ?? null;
const REGION_TYPES = ["PANEL", "BACKGROUND", "CHARACTER", "DIALOGUE_BUBBLE", "EFFECT"];
for (let i = 0; i < REGION_TYPES.length; i++) {
  await conn.query(
    "INSERT INTO `Task_Price_Rule` (rule_id, rule_name, region_type, base_price, is_active, effective_from, created_by_user_id) VALUES (?,?,?,5000,1,'2020-01-01',?) ON DUPLICATE KEY UPDATE base_price=VALUES(base_price), is_active=VALUES(is_active), region_type=VALUES(region_type)",
    [9001 + i, `Test price ${REGION_TYPES[i]}`, REGION_TYPES[i], adminId],
  );
}
console.log(`Seeded ${REGION_TYPES.length} Task_Price_Rule rows (base 5000 per region type).`);
await conn.end();

const out = { password: PASSWORD, apiBase: API, generated: "deterministic test set (2 per role)", accounts: accounts.map(({ role, email, name, id }) => ({ role, email, name, id })) };
writeFileSync(join(import.meta.dirname, "..", "accounts.json"), JSON.stringify(out, null, 2));

console.log(`\nSeeded ${accounts.length} accounts (${created} new, ${accounts.length - created} updated). Verifying logins via ${API} ...\n`);
console.log("ROLE".padEnd(16) + "EMAIL".padEnd(44) + "ID".padEnd(5) + "LOGIN");
let ok = 0, fail = 0;
for (const a of accounts) {
  try {
    const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: a.email, password: PASSWORD }) });
    const j = await res.json().catch(() => ({}));
    const good = res.ok && !!j.accessToken && j.user?.role === a.role;
    console.log(a.role.padEnd(16) + a.email.padEnd(44) + String(a.id).padEnd(5) + (good ? "OK" : `FAIL (${res.status})`));
    good ? ok++ : fail++;
  } catch (e) {
    console.log(a.role.padEnd(16) + a.email.padEnd(44) + String(a.id).padEnd(5) + "ERR " + e.message);
    fail++;
  }
}
console.log(`\nRESULT: login OK ${ok}/${accounts.length}, fail ${fail} | password "${PASSWORD}" | accounts.json written`);
process.exit(fail === 0 ? 0 : 1);
