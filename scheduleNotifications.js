require("dotenv").config();

const mysql = require("mysql");

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectionLimit: 5,
      connectTimeout: 10000,
    });
  }

  async query(sql) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, (err, results) => {
        if (err) {
          console.error("MySQL Query Error:", err);
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  close() {
    this.pool.end();
  }
}

async function scheduleNotifications() {
  const db = new Database();

  try {
    const query = `
      SELECT news_title, news_description, news_date 
      FROM tbl_news 
      WHERE news_status = 1 
      AND news_date >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY) 
      ORDER BY RAND() 
      LIMIT 3
    `;
    const posts = await db.query(query);

    if (!posts.length) {
      console.log("No active or recent posts found.");
      return;
    }

    const count = Math.floor(Math.random() * 2) + 2;
    const selectedPosts = [];
    const usedIndices = new Set();
    while (selectedPosts.length < count && usedIndices.size < posts.length) {
      const index = Math.floor(Math.random() * posts.length);
      if (!usedIndices.has(index)) {
        usedIndices.add(index);
        selectedPosts.push(posts[index]);
      }
    }

    if (!selectedPosts.length) {
      console.log("No notifications scheduled due to lack of posts.");
      return;
    }

    const timeWindows = [
      { start: 8, end: 9 },
      { start: 12, end: 13 },
      { start: 16, end: 17 },
      { start: 19, end: 20 },
    ];

    const notificationTimes = [];
    for (let i = 0; i < selectedPosts.length; i++) {
      const window = timeWindows[Math.floor(Math.random() * timeWindows.length)];
      const hour = Math.floor(Math.random() * (window.end - window.start)) + window.start;
      const minute = Math.floor(Math.random() * 60);
      notificationTimes.push({ hour, minute });
      const post = selectedPosts[i];
      console.log(
        `Scheduled for ${hour}:${minute} IST: ${post.news_title} - ${post.news_description.substring(0, 100)}...`
      );
    }
  } catch (err) {
    console.error("Function execution error:", err);
  } finally {
    db.close();
  }
}

scheduleNotifications();
