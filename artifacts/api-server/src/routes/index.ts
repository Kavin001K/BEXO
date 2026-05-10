import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import ocrRouter from "./ocr";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/storage", storageRouter);
router.use("/storage", ocrRouter);

export default router;
