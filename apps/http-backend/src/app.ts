import express, { Express } from "express";
import cors from "cors";

const app: Express = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Import Routes
import userRouter from './routes/user.routes';
import meetRouter from './routes/meet.routes';

// Using Routes
app.use('/api/v1/user', userRouter);
app.use('/api/v1/meet', meetRouter);

export { app }