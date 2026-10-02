import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { validateLogin, validateRegister } from "../middleware/validation";

export const authRoutes = Router();
authRoutes.post("/register", validateRegister, register);
authRoutes.post("/login", validateLogin, login);
authRoutes.get("/me", requireAuth, me);
authRoutes.post("/logout", logout);
