const functions = require("firebase-functions");
const { default: next } = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
  // Path to your Next.js project
  conf: { distDir: ".next" }
});

const handle = app.getRequestHandler();

exports.nextApp = functions.https.onRequest((req: any, res: any) => {
  return app.prepare().then(() => handle(req, res));
});
