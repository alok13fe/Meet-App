import { Router } from "express";
import { authUser } from "../middlewares/auth.middleware";
import { createMeet, joinMeet } from "../controllers/meet.controller";

const router: Router = Router();

router.post('/create', authUser, createMeet);

router.get('/join/:meetId', authUser, joinMeet);


export default router;