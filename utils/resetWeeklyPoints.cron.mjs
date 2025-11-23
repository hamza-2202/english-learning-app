import cron from "node-cron";
import { Progress } from "../models/progress.model.mjs"

console.log(`cron job set`);

// Helper: Wait X milliseconds
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function executeWeeklyReset(retryCount = 0) {
    try {
        console.log(`Weekly Reset Attempt ${retryCount + 1}...`)

        const result = await Progress.updateMany({}, [
            {
                $set: {
                    weeklyPoints: 0,
                    totalPoints: "$permanentPoints"
                }
            }
        ])

        console.log(`Weekly Reset Successful. Modified ${result.modifiedCount} documents.`)
        return true;
    } catch (err) {
        console.error(`Weekly Reset Failed on Attempt ${retryCount + 1}: ${err.message}`)

        if (retryCount < 2) {
            console.log("Retrying in 15 seconds...")
            await delay(15000)
            return executeWeeklyReset(retryCount + 1)
        }

        console.error("CRITICAL: Weekly Reset Failed After 3 Attempts.")
        return false;
    }
}

// Cron Job → Every Monday at 02:00 AM
cron.schedule("* 2 * * 1", async () => {
    console.log("Weekly Reset Cron Job Triggered")
    await executeWeeklyReset()
}, {
    scheduled: true,
    timezone: "Asia/Karachi"
})
