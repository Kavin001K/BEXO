import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import ocrRouter from "./ocr";
import onboardingRouter from "./onboarding";
import profileRouter from "./profile";
import portfolioRouter from "./portfolio";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth",       authRouter);
router.use("/storage",    storageRouter);
router.use("/storage",    ocrRouter);
router.use("/onboarding", onboardingRouter);
router.use("/profile",    profileRouter);
router.use("/portfolio",  portfolioRouter);


export default router;
