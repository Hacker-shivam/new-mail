import express from "express";

import trackingRoutes from "./routes/trackingRoutes.js";
import corsMiddleware from "./middleware/corsMiddleware.js";
import emailRoutes from "./routes/emailRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import formSubmissionRoutes from "./routes/formSubmissionRoutes.js";
import { healthCheck } from "./controllers/healthController.js";
import { templateAssetRoot } from "./utils/templateAssets.js";

const app = express();

/* MIDDLEWARE */

app.use(express.json({
   limit: "5mb"
}));

app.use(express.urlencoded({
   extended: true,
   limit: "5mb"
}));

app.use(express.text({
   limit: "5mb"
}));

app.set("trust proxy", true);

/* CUSTOM CORS */

app.use(corsMiddleware);

app.use("/template-assets", express.static(templateAssetRoot, {
   fallthrough: false,
   immutable: true,
   maxAge: "30d"
}));

// email routes
app.use("/api", emailRoutes);

// contacts and campaign dashboard routes
app.use("/api", contactRoutes);

app.use("/api", formSubmissionRoutes);

app.use("/api/campaigns", campaignRoutes);

// template routes
app.use("/api/templates", templateRoutes);

app.use("/track", trackingRoutes);

/* HEALTH */

app.get("/", (req, res) => {
   res.send("Tracking Server Running");
});

app.get("/health", healthCheck);

export default app;
