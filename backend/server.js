const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

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

// 2. CREATE ROOM (Create) - NEW
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

// 3. UPDATE ROOM (Update) - NEW
app.put("/api/rooms/:id", verifyToken, async (req, res) => {
  try {
    await db.collection("rooms").doc(req.params.id).update(req.body);
    res.json({ message: "Room updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE ROOM (Delete) - NEW
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
    const { roomId, date, startHour } = req.body;

    // Check conflict
    const conflict = await db
      .collection("bookings")
      .where("roomId", "==", roomId)
      .where("date", "==", date)
      .where("startHour", "==", startHour)
      .get();

    if (!conflict.empty) {
      return res.status(409).json({ message: "Slot already taken" });
    }

    const newBooking = {
      ...req.body,
      type: "busy",
      createdBy: req.user.uid,
      creatorEmail: req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("bookings").add(newBooking);
    res.status(201).json({ id: docRef.id, ...newBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. UPDATE BOOKING (Update) - NEW
app.put("/api/bookings/:id", verifyToken, async (req, res) => {
  try {
    const { roomId, date, startHour } = req.body;
    const bookingId = req.params.id;

    // Check if the booking exists and belongs to user
    const docRef = db.collection("bookings").doc(bookingId);
    const doc = await docRef.get();

    if (!doc.exists)
      return res.status(404).json({ message: "Booking not found" });
    if (doc.data().createdBy !== req.user.uid)
      return res.status(403).json({ message: "Unauthorized" });

    // Check for conflicts (excluding the current booking itself)
    const conflictSnapshot = await db
      .collection("bookings")
      .where("roomId", "==", roomId)
      .where("date", "==", date)
      .where("startHour", "==", startHour)
      .get();

    // Filter out the current booking from the conflict check
    const isConflict = conflictSnapshot.docs.some((d) => d.id !== bookingId);

    if (isConflict) {
      return res
        .status(409)
        .json({ message: "Slot already taken by another booking" });
    }

    await docRef.update(req.body);
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
    if (doc.data().createdBy !== req.user.uid)
      return res.status(403).json({ message: "Unauthorized" });

    await docRef.delete();
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
