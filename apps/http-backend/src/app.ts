import express, { Express } from "express";
import cors from "cors";
import { rateLimit } from 'express-rate-limit';

const app: Express = express();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 100,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	ipv6Subnet: 56,
  message: "Too many requests, please try again after 15 minutes."
});

app.use(limiter);
app.use(cors({
  origin: ['http://localhost:3000'],
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