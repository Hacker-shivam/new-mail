const corsMiddleware = (req, res, next) => {

   const sourceOrigin = process.env.API_URL;

   /* ---------------- CORS ---------------- */

   res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
   );

   res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, AMP-Email-Sender"
   );

   res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
   );

   /* ---------------- AMP EMAIL ---------------- */

   res.setHeader(
      "AMP-Access-Control-Allow-Source-Origin",
      sourceOrigin
   );

   res.setHeader(
      "Access-Control-Expose-Headers",
      "AMP-Access-Control-Allow-Source-Origin"
   );

   
   res.setHeader("Cache-Control", "no-store");
  
   /* ---------------- PREFLIGHT ---------------- */

   if (req.method === "OPTIONS") {
      return res.sendStatus(200);
   }

   next();
};

export default corsMiddleware;