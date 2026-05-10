import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import SupportTicket from "../models/SupportTicket.js";

const router = express.Router();

// Create a new support ticket
router.post("/", protect, async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      message,
      category,
      priority,
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: "Error creating ticket" });
  }
});

// Get user's own tickets
router.get("/my-tickets", protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets" });
  }
});

// Get unread ticket count for notifications
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await SupportTicket.countDocuments({ 
      user: req.user._id, 
      userHasSeen: false 
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread count" });
  }
});

// Mark all tickets as seen
router.put("/mark-as-seen", protect, async (req, res) => {
  try {
    await SupportTicket.updateMany(
      { user: req.user._id, userHasSeen: false },
      { userHasSeen: true }
    );
    res.json({ message: "Tickets marked as seen" });
  } catch (error) {
    res.status(500).json({ message: "Error updating tickets" });
  }
});

// Get all tickets (Admin only)
router.get("/all", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("user", "name email")
      .populate("replies.user", "name role")
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all tickets" });
  }
});

// Update ticket status or add a reply
router.put("/:id", protect, async (req, res) => {
  try {
    const { status, replyMessage } = req.body;
    let ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Only admin can change status, anyone can reply if authorized
    if (status && req.user.role === "admin") {
      ticket.status = status;
      ticket.userHasSeen = false; // Alert the user
    }

    if (replyMessage) {
      ticket.replies.push({
        user: req.user._id,
        message: replyMessage,
      });
      
      if (req.user.role === "admin") {
        ticket.userHasSeen = false; // Alert the user
      }
    }

    await ticket.save();
    
    // Return fully populated ticket
    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate("user", "name email")
      .populate("replies.user", "name role");
      
    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: "Error updating ticket" });
  }
});

export default router;
