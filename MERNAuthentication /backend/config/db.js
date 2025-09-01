import mongoose from "mongoose";

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI,{
        dbName:"MERNAuthentication"
    })
    console.log("MonogoDB connected");
    
  } catch (eror) {
    console.log("Failed to connect ");
  }
};

export default connectDb;