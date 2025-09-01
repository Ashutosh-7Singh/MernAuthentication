import { registerSchema } from "../config/zod.js";
import TryCatch from "../middlewares/TryCatch.js";
import sanitize from "mongo-sanitize";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendMail from "../config/sendMail.js";
import { getVerifyEmailHtml } from "../config/html.js";
import { redisclient } from "../index.js";

export const registerUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);
  const validation = registerSchema.safeParse(sanitizedBody);
  // const { name, email, password } = sanitize(req.body);
  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "Validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "Validation Error",
        code: issue.code,
      }));
      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }
    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }
  const { name, email, password } = validation.data;

  const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;

  if (await redisclient.get(rateLimitKey)) {
    return res.status(429).json({
      message: "Too many requests , try again later ",
    });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      message: "User already exists",
    });
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const verifyToken = crypto.randomBytes(32).toString("hex");

  const verifyKey = `verify:${verifyToken}`;

  const datatoStore = JSON.stringify({
    name,
    email,
    password: hashPassword,
  });

  await redisclient.set(verifyKey, datatoStore, { EX: 300 });

  const subject = "verify your email for Account Creation";

  const html = getVerifyEmailHtml({ email, token: verifyToken });

  await sendMail({ email, subject, html });

  await redisclient.set(rateLimitKey, "true", { EX: 60 });
  res.json({
    message:
      "If your email is valid , a verification link had beed sent.it will expire in 5 minutes",
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;

  if (token) {
    return res.status(400).json({ message: "verification token is required" });
  }

  const verifyKey= `verify:${token}`;

  const userDataJson =  await redisclient.get(verifyKey)
  if(!userDataJson){
    return res.status(400).json({
message:"Verification Link is expired. ",
    })
  }
  await redisclient.del(verifyKey);
  const userData= JSON.parse(userDataJson)

    const existingUser = await User.findOne({ email:userData.email });

  if (existingUser) {
    return res.status(400).json({
      message: "User already exists",
    });
  } 
  const newUser =  await User.create({
    name:userData.name,
    email:userData.email,
    password:userData.password,
  });
  res.status(201).json({
    message:"Email verified successfully! your account has been  created",
    user:{_id:newUser._id,name:newUser.name,email:newUser.email},
  })
});
