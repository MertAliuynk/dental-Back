const express = require("express");
const dotenv = require("dotenv");
const router = require("./routers/index.js");
const customErrorHandler = require("./middlewares/err/customErrorHandler.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const runMigrations = require("./helpers/db/scripts/runMigrations");
const ensureAdminUser = require("./helpers/db/scripts/ensureAdminUser");
require('./scheduledSmsSender');

dotenv.config({
    path : "./config/env/.env"
})

const PORT = process.env.PORT
const app = express();

app.use(cors({
  origin: 'https://dental.karadenizdis.com', // veya origin: '*' (güvenlik için prod'da domain yaz)
  credentials: true // Eğer cookie/jwt ile auth varsa
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api",router);
app.use(customErrorHandler);
app.use(express.static(path.join(__dirname,"public")));


// Start server only after DB migrations complete
async function start() {
    try {
        await runMigrations();
        await ensureAdminUser();
        app.listen(PORT, () => {
            console.log(`Server Dinleniyor Port = ${PORT}`);
        });
    } catch (err) {
        console.error("Startup aborted due to migration error:", err);
        process.exit(1);
    }
}

start();
