import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { connectDB } from "@repo/db/main";

connectDB()
.then(() => {
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is listening at PORT: ${process.env.PORT || 8000}`);
  });

  server.on("error", (error) => {
    console.log(`ERROR: ${error}`);
    throw error;
  });

  /* Graceful Shutdown of Server */
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('Server shutdown successfully!')
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('Server shutdown successfully!')
    });
  });
})
.catch((error) => {
  console.log(`MongoDB Connection FAILED !!! ${error}`);
})