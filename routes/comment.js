import express from "express";
import { prisma } from "../lib/db.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

//Helper function to recursively fetch all nested replies
async function getCommentWithReplies(commentId) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
        },
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: [{ upvotes: "desc" }, { created_at: "desc" }],
      },
    },
  });

  if (!comment) return null;

  // Recursively fetch replies for each reply
  if (comment.replies && comment.replies.length > 0) {
    comment.replies = await Promise.all(
      comment.replies.map((reply) => getCommentWithReplies(reply.id))
    );
  }

  return comment;
}

//Create new comment or reply
router.post("/create", authenticate, async (req, res) => {
  try {
    const { text, parent_id = null } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Text is required",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        user_id: req.user.id,
        parent_id: parent_id ? parseInt(parent_id) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//Upvote comment
router.post("/:id/upvote", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.update({
      where: { id: parseInt(id) },
      data: {
        upvotes: { increment: 1 },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error("Error upvoting comment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//GET all first-level comments (parent_id = null)
router.get("/", authenticate, async (req, res) => {
  try {
    const { sortBy = "top" } = req.query;

    const orderBy =
      sortBy === "top"
        ? [{ upvotes: "desc" }, { created_at: "desc" }]
        : { created_at: "desc" };

    const comments = await prisma.comment.findMany({
      where: { parent_id: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy,
    });

    res.json({
      success: true,
      data: {
        comments,
        currentUser: req.user,
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//GET single comment with all nested replies (recursive)
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Valid comment ID is required",
      });
    }

    const comment = await getCommentWithReplies(parseInt(id));

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error("Error fetching comment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//DELETE comment (Admin only)
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingComment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    await prisma.comment.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
