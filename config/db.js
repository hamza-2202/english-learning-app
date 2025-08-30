import mongoose from "mongoose";
import { DB_NAME } from "../constants.mjs";

export const connectDB = async () => {
    try{
        const conn = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`Connected to ${conn.connection.host}`);
        
    }catch(err){
        console.log(`Error: ${err.message}`);
    }
}