require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const SECRET = "secret";


// ================== TEST ==================
app.get("/", (req, res) => {
  res.send("Server töötab!");
});


// ================== DB FIX ==================
app.get("/fix-db", async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE work_logs 
      ADD COLUMN IF NOT EXISTS date DATE;
    `);

    await pool.query(`
      ALTER TABLE work_logs 
      ADD COLUMN IF NOT EXISTS hours FLOAT;
    `);

    res.send("DB fixed ✅");
  } catch (err) {
    console.error(err);
    res.send("DB error");
  }
});


// ================== REGISTER ==================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hash]
    );

    res.send("User created ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


// ================== LOGIN ==================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).send("User not found");

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).send("Wrong password");

    const token = jwt.sign({ id: user.id }, SECRET);

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


// ================== ADD WORKLOG ==================
app.post("/worklog", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send("No token");

    const decoded = jwt.verify(token, SECRET);
    const user_id = decoded.id;

    const { object, description, start_time, end_time, date } = req.body;

    // ⏱️ HOURS CALCULATION
    const start = new Date(`1970-01-01T${start_time}`);
    const end = new Date(`1970-01-01T${end_time}`);
    const hours = (end - start) / (1000 * 60 * 60);

    await pool.query(
      `INSERT INTO work_logs 
       (user_id, object, description, start_time, end_time, date, hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user_id, object, description, start_time, end_time, date, hours]
    );

    res.send("Saved ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.get("/fix-hours", async (req, res) => {
  await pool.query(`
    UPDATE work_logs
    SET hours = EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    WHERE hours IS NULL;
  `);

  res.send("Hours fixed ✅");
});
// ================== GET WORKLOGS ==================
app.get("/worklogs", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send("No token");

    const decoded = jwt.verify(token, SECRET);

    const result = await pool.query(
      "SELECT * FROM work_logs WHERE user_id=$1 ORDER BY date DESC",
      [decoded.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


// ================== UPDATE ==================
app.put("/worklog/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);

    const { id } = req.params;
    const { object, description, start_time, end_time, date } = req.body;

    const start = new Date(`1970-01-01T${start_time}`);
    const end = new Date(`1970-01-01T${end_time}`);
    const hours = (end - start) / (1000 * 60 * 60);

    await pool.query(
      `UPDATE work_logs 
       SET object=$1, description=$2, start_time=$3, end_time=$4, date=$5, hours=$6
       WHERE id=$7 AND user_id=$8`,
      [object, description, start_time, end_time, date, hours, id, decoded.id]
    );

    res.send("Updated ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


// ================== DELETE ==================
app.delete("/worklog/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);

    const { id } = req.params;

    await pool.query(
      "DELETE FROM work_logs WHERE id=$1 AND user_id=$2",
      [id, decoded.id]
    );

    res.send("Deleted ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});


// ================== START ==================
app.listen(5000, () => {
  console.log("Server running on port 5000");
});