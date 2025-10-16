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

router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
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
            _count: {
              select: {
                replies: true,
              },
            },
          },
          orderBy: {
            upvotes: "desc",
          },
        },
      },
    });

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
      error: "Failed to fetch comment",
    });
  }
});

// DELETE /api/comments/:id - Delete comment (Admin or Owner)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // First, fetch the comment to check ownership
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
      select: { user_id: true },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    // Check if user is admin OR owner of the comment
    const isAdmin = userRole === "ADMIN";
    const isOwner = comment.user_id === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to delete this comment",
      });
    }

    // Delete the comment and all its replies (cascade)
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
      error: "Failed to delete comment",
    });
  }
});

export default router;
