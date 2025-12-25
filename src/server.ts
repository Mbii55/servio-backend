import 'dotenv/config';

import app from './app';
import pool from './config/database';

const PORT = process.env.PORT || 5000;

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) console.error("❌ Database connection failed:", err);
  else console.log("✅ Database connected at:", res.rows[0].now);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API: http://localhost:${PORT}/api/v1`);
});
