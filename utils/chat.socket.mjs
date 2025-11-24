import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import { Message } from "../models/message.model.mjs"
import { User } from "../models/user.model.mjs"

// A simple in-memory map: userId -> Set of socketIds
const onlineUsers = new Map()

async function verifyTokenHandshake(token) {
    if (!token) return null
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(payload._id).select("_id name email")
        if (!user) return null
        return user
    } catch (err) {
        return null
    }
}

export const initChat = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
        },
    })

    // Decide whether to persist messages in database
    const PERSIST = process.env.CHAT_PERSIST    // true or false

    io.on("connection", async (socket) => {
        // Authentication on connection
        const token = socket.handshake.auth?.token
        const user = await verifyTokenHandshake(token)

        if (!user) {
            // emit error then disconnect
            socket.emit("unauthorized")
            return socket.disconnect(true)
        }

        const uid = user._id.toString()

        // add this socketId to the user's set
        const existing = onlineUsers.get(uid) || new Set()
        existing.add(socket.id)
        onlineUsers.set(uid, existing)

        // let other side know user is online
        io.emit("user:online", { userId: uid })

        const getRoomName = (a, b) => {
            return `chat:${[a, b].sort().join("_")}`
        }

        // client may request to join a conversation (so server can send history or route messages)
        socket.on("join", async ({ withUserId }) => {
            if (!withUserId) return
            const room = getRoomName(uid, withUserId)
            socket.join(room)

            // optional: send last N messages if persisted
            if (PERSIST) {
                const lastMessages = await Message.find({
                    $or: [
                        { from: uid, to: withUserId },
                        { from: withUserId, to: uid },
                    ],
                })
                    .sort({ createdAt: 1 })
                    .limit(50) // last 50 messages
                    .lean()
                socket.emit("chat:history", { withUserId, messages: lastMessages })
            } else {
                socket.emit("chat:joined", { withUserId })
            }
        })

        // one-to-one messaging
        socket.on("private:message", async ({ to, text }) => {  // extra still received but ignored
            if (!to || !text || typeof text !== "string") return
            if (text.trim().length === 0) {
                return socket.emit("error", { message: "Message cannot be empty" })
            }
            if (text.length > 5000) {
                return socket.emit("error", { message: "Message too long" })
            }

            const room = getRoomName(uid, to)

            const messageData = {
                from: uid,
                to,
                text: text.trim(),
            }

            let finalMessage = null
            if (PERSIST) {
                try {
                    const savedMessage = await Message.create(messageData)
                    finalMessage = savedMessage.toObject()
                    // Send only schema-defined fields
                } catch (err) {
                    console.error("Failed to save message:", err)
                }
            } else {
                finalMessage = {
                    ...messageData,
                    _id: new mongoose.Types.ObjectId(), // fake _id
                    createdAt: new Date(),
                }
            }

            io.to(room).emit("private:message", finalMessage)

            // Send push preview notification (only if recipient is NOT in the room)
            const recipientSockets = onlineUsers.get(to)
            if (recipientSockets) {
                const recipientInRoom = [...recipientSockets].some(id =>
                    io.sockets.sockets.get(id)?.rooms.has(room)
                )

                if (!recipientInRoom) {
                    for (const sid of recipientSockets) {
                        io.to(sid).emit("notification:new_message", {
                            from: uid,
                            fromName: user.name,
                            text: text.trim(),
                            timestamp: finalMessage.createdAt,
                        })
                    }
                }
            }
        })

        // typing indicator
        socket.on("typing", ({ to, isTyping }) => {
            if (!to || typeof isTyping !== "boolean") return
            const room = getRoomName(uid, to)
            // broadcast typing only to the other sockets in the room
            socket.to(room).emit("typing", { from: uid, isTyping })
        })

        // disconnect handling
        socket.on("disconnect", () => {
            const set = onlineUsers.get(uid)
            if (set) {
                set.delete(socket.id)
                if (set.size === 0) {
                    onlineUsers.delete(uid)
                    socket.broadcast.emit("user:offline", { userId: uid })
                } else {
                    onlineUsers.set(uid, set)
                }
            }
        })
    })

    console.log("Socket.IO Chat Server Initialized")
}