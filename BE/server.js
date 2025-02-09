const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// Tạo Schema MongoDB
const scheduleSchema = new mongoose.Schema({
    mssv: String,
    schedule: Object,
    createdAt: { type: Date, default: Date.now }
});
const Schedule = mongoose.model("Schedule", scheduleSchema);

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets API
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });

// ID của Google Sheet
const SPREADSHEET_ID = process.env.SHEET_ID;

// API Nhận lịch đăng ký
app.post("/submit", async (req, res) => {
    try {
        const { mssv, ...scheduleData } = req.body;

        if (!mssv) {
            return res.status(400).json({ message: "⚠️ MSSV không được để trống!" });
        }

        // 1️⃣ Lưu vào MongoDB
        const newSchedule = new Schedule({ mssv, schedule: scheduleData });
        await newSchedule.save();

        // 2️⃣ Ghi vào Google Sheets
        const values = [[mssv, JSON.stringify(scheduleData), new Date().toISOString()]];
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Sheet1!A:C",
            valueInputOption: "RAW",
            resource: { values }
        });

        res.json({ message: "✅ Đăng ký thành công!" });
    } catch (error) {
        console.error("❌ Lỗi xử lý dữ liệu:", error);
        res.status(500).json({ message: "❌ Lỗi server, vui lòng thử lại!" });
    }
});

// API Lấy danh sách lịch đăng ký
app.get("/schedules", async (req, res) => {
    try {
        const schedules = await Schedule.find().sort({ createdAt: -1 });
        res.json(schedules);
    } catch (error) {
        console.error("❌ Lỗi lấy dữ liệu:", error);
        res.status(500).json({ message: "❌ Không thể lấy dữ liệu!" });
    }
});

app.get("/", (req, res) => {
    res.json({ message: "🚀 Backend API hoạt động thành công trên Vercel!" });
});


// Chạy server
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
