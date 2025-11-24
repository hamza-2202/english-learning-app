// models/message.model.mjs
import mongoose from "mongoose"

const MessageSchema = new mongoose.Schema(
    {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
    },
    {
        timestamps: true,
        strict: true,
        strictQuery: true
    }
)

MessageSchema.index({ from: 1, to: 1, createdAt: -1 })
MessageSchema.index({ to: 1, from: 1, createdAt: -1 })

export const Message = mongoose.model("Message", MessageSchema)