import express from "express";
import { db, saveDb } from "../storage.js";

export const router = express.Router();

// ==========================================
// FREQUENT FRIENDS (PEOPLE I CAMP WITH)
// ==========================================

router.get("/api/friends", (req, res) => {
  const userId = (req.query.userId as string) || "usr_host";
  const userFriends = db.friends.filter(f => f.userId === userId);
  return res.json({ friends: userFriends });
});

router.post("/api/friends", (req, res) => {
  const { userId, friendEmail, friendName, tags } = req.body;
  if (!friendEmail) {
    return res.status(400).json({ error: "Friend email is required" });
  }

  const existing = db.friends.find(f => f.userId === userId && f.friendEmail.toLowerCase() === friendEmail.toLowerCase());
  if (existing) {
    return res.json({ friend: existing, message: "Already in frequent friends list" });
  }

  const newFriend = {
    id: `fr_${Date.now()}`,
    userId: userId || "usr_host",
    friendEmail: friendEmail.toLowerCase(),
    friendName: friendName || friendEmail.split("@")[0],
    tags: tags || ["Camper"]
  };
  db.friends.push(newFriend);
  saveDb();
  return res.status(201).json({ friend: newFriend });
});

router.delete("/api/friends/:id", (req, res) => {
  const { id } = req.params;
  const idx = db.friends.findIndex(f => f.id === id);
  if (idx !== -1) {
    db.friends.splice(idx, 1);
    saveDb();
  }
  return res.json({ success: true });
});
