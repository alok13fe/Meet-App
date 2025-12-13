import mongoose from "mongoose";

export default async function connectDB(){
  try{
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI as string, {
      dbName: process.env.DB_NAME
    });
    console.log(`MongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch(error){
    console.log(`MongoDB Connection Failed: ${error}`);
    process.exit(1);
  }
}