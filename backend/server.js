const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const { DateTime } = require("luxon");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

// Service Account Setup
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// --- AUTH MIDDLEWARE ---
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

// --- ROUTES ---

// 1. GET ALL ROOMS (Read)
app.get("/api/rooms", async (req, res) => {
  try {
    const snapshot = await db.collection("rooms").get();
    const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. CREATE ROOM
app.post("/api/rooms", verifyToken, async (req, res) => {
  try {
    // Basic validation: Name and MaxCapacity are required
    if (!req.body.name || !req.body.maxCapacity) {
      return res
        .status(400)
        .json({ message: "Name and MaxCapacity are required" });
    }
    const docRef = await db.collection("rooms").add(req.body);
    res.status(201).json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. UPDATE ROOM
app.put("/api/rooms/:id", verifyToken, async (req, res) => {
  try {
    await db.collection("rooms").doc(req.params.id).update(req.body);
    res.json({ message: "Room updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE ROOM
app.delete("/api/rooms/:id", verifyToken, async (req, res) => {
  try {
    await db.collection("rooms").doc(req.params.id).delete();
    res.json({ message: "Room deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET BOOKINGS
app.get("/api/bookings", async (req, res) => {
  try {
    const { date } = req.query;
    let query = db.collection("bookings");
    if (date) query = query.where("date", "==", date);

    const snapshot = await query.get();
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. CREATE BOOKING
app.post("/api/bookings", verifyToken, async (req, res) => {
  try {
    // recurrence: { type: 'none' | 'daily' | 'weekly' | 'monthly', endDate: 'YYYY-MM-DD' }
    const { roomId, date, startTime, duration, recurrence } = req.body;

    if (!roomId || !date || startTime == null || !duration) {
      return res.status(400).json({ message: "Invalid booking data" });
    }

    // 1. GENERATE DATES
    const datesToBook = [];
    const startDt = DateTime.fromISO(date); // Start Date

    // Default to just today if no recurrence
    let currentDt = startDt;
    let endDt = startDt;

    // If recurrence exists, parse the end date
    if (recurrence && recurrence.type !== "none" && recurrence.endDate) {
      endDt = DateTime.fromISO(recurrence.endDate);
    }

    // Loop to generate dates
    while (currentDt <= endDt) {
      datesToBook.push(currentDt.toISODate());

      if (!recurrence || recurrence.type === "none") break;

      switch (recurrence.type) {
        case "daily":
          currentDt = currentDt.plus({ days: 1 });
          break;
        case "weekly":
          currentDt = currentDt.plus({ weeks: 1 });
          break;
        case "monthly":
          currentDt = currentDt.plus({ months: 1 });
          break;
        default:
          currentDt = endDt.plus({ days: 1 }); // Break loop
      }
    }

    // Limit recurrence to reasonable amount (e.g., 50 bookings max) to prevent abuse
    if (datesToBook.length > 50) {
      return res
        .status(400)
        .json({ message: "Recurrence limit exceeded (max 50 instances)" });
    }

    // 2. VALIDATION & CONFLICT CHECK (For ALL dates)
    const now = DateTime.now().setZone("Asia/Ho_Chi_Minh");
    const newStart = startTime;
    const newEnd = startTime + duration;

    // We'll use a batch for atomic writes
    const batch = db.batch();
    const newBookingsData = [];
    const groupId = datesToBook.length > 1 ? uuidv4() : null; // Common ID for series

    for (const bookingDate of datesToBook) {
      // A. Past Time Check
      const startMins = Number(startTime);
      const hours = Math.floor(startMins / 60);
      const minutes = startMins % 60;

      const bookingDateTime = DateTime.fromISO(bookingDate, {
        zone: "Asia/Ho_Chi_Minh",
      }).set({ hour: hours, minute: minutes });

      if (bookingDateTime.toMillis() < now.minus({ minutes: 1 }).toMillis()) {
        // Skip past dates in a series, or fail?
        // Usually better to fail if the *first* date is past, but skip others?
        // Let's fail for consistency with original logic.
        return res.status(400).json({
          message: `Không thể đặt lịch quá khứ: ${bookingDate}`,
        });
      }

      // B. Conflict Check (Query Firestore)
      const snapshot = await db
        .collection("bookings")
        .where("roomId", "==", roomId)
        .where("date", "==", bookingDate) // Check specific date
        .get();

      const hasConflict = snapshot.docs.some((doc) => {
        const b = doc.data();
        return b.startTime < newEnd && b.startTime + b.duration > newStart;
      });

      if (hasConflict) {
        return res.status(409).json({
          message: `Xung đột lịch vào ngày ${bookingDate}. Vui lòng kiểm tra lại.`,
        });
      }

      // Prepare Data
      const docRef = db.collection("bookings").doc();
      const bookingData = {
        ...req.body,
        date: bookingDate, // Override the single date
        type: "busy",
        createdBy: req.user.uid,
        creatorEmail: req.user.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        groupId: groupId, // Link them together
        recurrenceType: recurrence?.type || "none",
      };

      // Remove the raw recurrence obj from DB data to keep it clean
      delete bookingData.recurrence;

      batch.set(docRef, bookingData);
      newBookingsData.push({ id: docRef.id, ...bookingData });
    }

    // 3. COMMIT BATCH
    await batch.commit();

    res.status(201).json({
      message: "Bookings created successfully",
      count: newBookingsData.length,
      bookings: newBookingsData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// 7. UPDATE BOOKING (Update)
app.put("/api/bookings/:id", verifyToken, async (req, res) => {
  try {
    const { roomId, date, startTime, duration, title, guestCount, type } =
      req.body;
    const bookingId = req.params.id;

    const docRef = db.collection("bookings").doc(bookingId);
    const doc = await docRef.get();

    if (!doc.exists)
      return res.status(404).json({ message: "Booking not found" });

    // 1. Check if the user is an Admin (document exists in 'admins' collection)
    const adminDoc = await db.collection("admins").doc(req.user.email).get();
    const isAdmin = adminDoc.exists;

    // 2. Existing checks
    const isCreator = doc.data().creatorEmail === req.user.email;

    // 3. Authorization Logic
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const newStart = startTime;
    const newEnd = startTime + duration;

    const snapshot = await db
      .collection("bookings")
      .where("roomId", "==", roomId)
      .where("date", "==", date)
      .get();

    const hasConflict = snapshot.docs.some((d) => {
      if (d.id === bookingId) return false;

      const b = d.data();
      const existingStart = b.startTime;
      const existingEnd = b.startTime + b.duration;

      return existingStart < newEnd && existingEnd > newStart;
    });

    if (hasConflict) {
      return res.status(409).json({
        message: "Khung thời gian này bị trùng với một lịch đặt khác",
      });
    }

    const updatePayload = {};
    if (roomId) updatePayload.roomId = roomId;
    if (date) updatePayload.date = date;
    if (startTime !== undefined) updatePayload.startTime = startTime;
    if (duration !== undefined) updatePayload.duration = duration;
    if (title) updatePayload.title = title;
    if (guestCount) updatePayload.guestCount = guestCount;
    if (type) updatePayload.type = type;

    await docRef.update(updatePayload);

    // await docRef.update(req.body);
    res.json({ message: "Booking updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. DELETE BOOKING
app.delete("/api/bookings/:id", verifyToken, async (req, res) => {
  try {
    const docRef = db.collection("bookings").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ message: "Not found" });

    // 1. Check if the user is an Admin (document exists in 'admins' collection)
    const adminDoc = await db.collection("admins").doc(req.user.email).get();
    const isAdmin = adminDoc.exists;

    // 2. Existing checks
    const isCreator = doc.data().creatorEmail === req.user.email;

    // 3. Authorization Logic
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await docRef.delete();
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8b. DELETE RECURRING SERIES
app.delete("/api/bookings/series/:groupId", verifyToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId || groupId === "null") {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    // 1. Find all bookings in this series
    const snapshot = await db
      .collection("bookings")
      .where("groupId", "==", groupId)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ message: "No bookings found for this series" });
    }

    // 2. Authorization Check (Check the first one for ownership/admin)
    const firstDoc = snapshot.docs[0].data();
    const adminDoc = await db.collection("admins").doc(req.user.email).get();
    const isAdmin = adminDoc.exists;
    const isCreator = firstDoc.creatorEmail === req.user.email;

    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this series" });
    }

    // 3. Batch Delete
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    res.json({ message: `Deleted ${snapshot.size} recurring bookings` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. GET ROOM BY ID (Cho Tablet để hiển thị tên phòng/sức chứa)
app.get("/api/rooms/:id", async (req, res) => {
  try {
    const doc = await db.collection("rooms").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD STATS ---
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const roomsSnapshot = await db.collection("rooms").get();
    const bookingsSnapshot = await db.collection("bookings").get();

    const rooms = roomsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const allBookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const now = DateTime.now().setZone("Asia/Ho_Chi_Minh");
    const todayStr = now.toISODate(); // 'YYYY-MM-DD'

    // Convert current time to total minutes (e.g., 1:30 PM becomes 810)
    const currentMinutes = now.hour * 60 + now.minute;

    // 1. Calculate Live Stats for Cards
    const activeBookings = allBookings.filter(
      (b) =>
        b.date === todayStr &&
        currentMinutes >= b.startTime &&
        currentMinutes <= b.startTime + b.duration
    );

    const bookedRoomIds = activeBookings.map((b) => b.roomId);

    // 2. Prepare Data for Charts
    const roomUsageMap = {};
    const userActivityMap = {};

    rooms.forEach((r) => (roomUsageMap[r.name || r.id] = 0));

    allBookings.forEach((b) => {
      // Room Usage (for Bar Chart)
      const room = rooms.find((r) => r.id === b.roomId);
      if (room) {
        const name = room.name || room.id;
        roomUsageMap[name]++;
      }
      // User Activity (for Pie Chart)
      userActivityMap[b.creatorEmail] =
        (userActivityMap[b.creatorEmail] || 0) + 1;
    });

    // 3. Calculate 7-Day Trend (VN timezone safe)
    const d = DateTime.now().setZone("Asia/Ho_Chi_Minh");
    const last7Days = Array.from({ length: 7 }, (_, idx) =>
      d.minus({ days: 6 - idx }).toISODate()
    );

    const trendData = last7Days.map((dateStr) => {
      const count = allBookings.filter((b) => b.date === dateStr).length;
      return { date: dateStr, count };
    });

    res.json({
      summary: {
        totalRooms: rooms.length,
        currentlyBooked: bookedRoomIds.length,
        currentlyAvailable: rooms.length - bookedRoomIds.length,
        activeUsers: [...new Set(activeBookings.map((b) => b.creatorEmail))]
          .length,
      },
      charts: {
        roomUsage: {
          labels: Object.keys(roomUsageMap),
          data: Object.values(roomUsageMap),
        },
        topUsers: {
          labels: Object.keys(userActivityMap).slice(0, 5),
          data: Object.values(userActivityMap).slice(0, 5),
        },
        trend: {
          labels: trendData.map((d) => d.date),
          data: trendData.map((d) => d.count),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
