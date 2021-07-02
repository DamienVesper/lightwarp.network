// Packages
const express = require(`express`);
const cors = require(`cors`);
const path = require(`path`);
const ejsLayouts = require(`express-ejs-layouts`);
const log = require(`./utils/log.js`);
const mongoose = require(`mongoose`);

// Settings DB
const settings = require(`./utils/settings.js`)

settings();

// Express Initialization 

const app = express();

// MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: true }).then(() => {
    log(`green`, `User authentication has connected to database.`);
})

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
const indexRouter = require(`./routes/index.js`);
const apiRouter = require(`./routes/api.js`);
const pmRouter = require(`./routes/pm.js`);
const mediaRouter = require(`./routes/media.js`);
const listenRouter = require(`./routes/listen.js`);
const widgetRouter = require(`./routes/widget.js`);

app.use(`/`, indexRouter);
app.use(`/api`, apiRouter);
app.use(`/prioritymessage`, cors(), pmRouter);
app.use(`/mediashare`, cors(), mediaRouter);
app.use(`/listen`, listenRouter);
app.use(`/widget`, widgetRouter);

// Discord
require(`./discord`)

app.listen(process.env.PORT)
log(`magenta`, `Webserver Started on ${process.env.PORT}`)