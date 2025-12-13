// controllers/chat.controller.mjs
import asyncHandler from "express-async-handler";
import { Message } from "../models/message.model.mjs";

const getUserChats = asyncHandler(async (request, response) => {
    try {
        const userId = request.user._id

        const chats = await Message.aggregate([
            {
                $match: {
                    $or: [{ from: userId }, { to: userId }]
                }
            },
            {
                $addFields: {
                    otherUser: {
                        $cond: [{ $eq: ["$from", userId] }, "$to", "$from"]
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$otherUser",
                    lastMessage: { $first: "$text" },
                    timestamp: { $first: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    userId: "$_id",
                    name: "$user.name",
                    email: "$user.email",
                    level: "$user.level",
                    lastMessage: 1,
                    timestamp: 1
                }
            },
            { $sort: { timestamp: -1 } }
        ])

        response.status(200).json({ success: true, chats })
    } catch (err) {
        console.error("getUserChats error:", err);
        response.status(500)
        throw new Error(`Failed to load chats`)
    }
})

export {
    getUserChats
}