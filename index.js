require(`dotenv`).config();

// Packages
const express = require(`express`);
const cors = require(`cors`);
const path = require(`path`);
const ejsLayouts = require(`express-ejs-layouts`);
const log = require(`./utils/log.js`);

// Express Initialization 

const app = express();

// NGINX Proxy.
app.set(`trust proxy`, true);

// Set view engine.
app.set(`views`, path.resolve(__dirname, `views`));
app.set(`view engine`, `ejs`);

// Express extension configurations.
app.use(express.json({ limit: `5mb` }));
app.use(express.urlencoded({ limit: `5mb`, extended: true }));

// Serve the static directory.
app.use(express.static(path.resolve(__dirname, `./client`)));

// Middleware
app.use(cors());
app.use(ejsLayouts);

// Routes
const indexRouter = require(`./routes/index.js`)
const pmRouter = require(`./routes/pm.js`)
const listenRouter = require(`./routes/listen.js`)

app.use(`/`, indexRouter);
app.use(`/prioritymessage`, cors(), pmRouter);
app.use(`/listen`, listenRouter);

app.listen(process.env.PORT)
log(`green`, `Server Started on ${process.env.PORT}`)