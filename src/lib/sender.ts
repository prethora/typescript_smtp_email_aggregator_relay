import nodemailer from "nodemailer";
import { config } from "./config";

export const sender = nodemailer.createTransport(config.outgoing);