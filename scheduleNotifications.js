require("dotenv").config();
const mysql = require("mysql");
const axios = require("axios");

// Database class for MySQL interactions
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

// OneSignal class for sending notifications
class OneSignal {
  constructor(appId, apiKey) {
    this.appId = appId;
    this.apiKey = apiKey;
    this.baseUrl = "https://onesignal.com/api/v1/notifications";
    this.defaultChannelId = process.env.ONESIGNAL_ANDROID_CHANNEL_ID || "default_channel"; // Fallback to 'default_channel'
  }

  async sendNotification(title, body) {
    const payload = {
      app_id: this.appId,
      included_segments: ["All"], // Send to all subscribed users
      headings: { en: title },
      contents: { en: body },
      android_channel_id: this.defaultChannelId, // Use the configured channel ID
      small_icon: "ic_stat_onesignal_default", // Optional: Customize icon
      data: { action: "open_activity" }, // Optional: Custom data for the app
    };

    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Notification sent successfully:", response.data);
    } catch (error) {
      console.error("Error sending notification:", error.response ? error.response.data : error.message);
    }
  }
}

// Utility to format time with leading zeros
function formatTime(hour, minute) {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Main function to schedule and send notifications
async function scheduleNotifications() {
  const db = new Database();
  const oneSignal = new OneSignal(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_API_KEY);

  try {
    // Step 1: Fetch one random post from the last 7 days
    const query = `
      SELECT news_title, news_description, news_date 
      FROM tbl_news 
      WHERE news_status = 1 
      AND news_date >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY) 
      ORDER BY RAND() 
      LIMIT 1
    `;
    const posts = await db.query(query);

    if (!posts.length) {
      console.log("No active or recent posts found.");
      return;
    }

    const post = posts[0];
    console.log("Selected post:", post.news_title);

    // Step 2: Choose a random time window for the notification
    const timeWindows = [
      { start: 8, end: 9, label: "🌞 Morning Update" },
      { start: 12, end: 13, label: "🍴 Lunchtime News" },
      { start: 16, end: 17, label: "☕ Afternoon Alert" },
      { start: 19, end: 20, label: "🌙 Evening Digest" },
    ];

    const window = timeWindows[Math.floor(Math.random() * timeWindows.length)];
    const hour = Math.floor(Math.random() * (window.end - window.start)) + window.start;
    const minute = Math.floor(Math.random() * 60);
    const scheduledTime = formatTime(hour, minute);

    // Step 3: Enhance the notification with eye-catchy elements
    const title = `${window.label}: ${post.news_title} 🚀`;
    let body = post.news_description.substring(0, 100);
    // Remove HTML tags for clean notification text
    body = body.replace(/<[^>]+>/g, "");
    body = `${body}... Tap to read more! 📖`;

    // Step 4: Log the scheduled notification
    console.log(`Scheduled for ${scheduledTime} IST: ${title} - ${body}`);

    // Step 5: Send the notification immediately using OneSignal
    await oneSignal.sendNotification(title, body);
  } catch (err) {
    console.error("Function execution error:", err);
  } finally {
    db.close();
  }
}

// Run the function
scheduleNotifications();
