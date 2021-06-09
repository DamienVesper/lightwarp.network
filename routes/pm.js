const express = require(`express`);

var cors = require(`cors`)

const router = express.Router();

const paypal = require(`paypal-rest-sdk`);

const Discord = require(`discord.js`);
const gTTS = require(`gtts`);
const fs = require(`fs`);
const { Console } = require("console");
const http = require(`http`);
const client = new Discord.Client();

const log = require(`../utils/log.js`);

const server = http.createServer();
const { Server } = require("socket.io");

const io = new Server(server);

server.listen(4550, () => {
    log(`magenta`, `Socket.IO listening on Port 4550`);
});

io.on(`connection`, async (socket) => {
    log(`yellow`, `Chat Connection | IP: ${socket.handshake.address}.`);
})

// Active Transactions
let transactions = [];

// Paypal Configuration.
if (process.env.ENV === `dev`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_SANDBOX, //sandbox or live
        client_id: process.env.PAYPAL_CLIENT_ID_SANDBOX,
        client_secret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX
    });
} else {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_LIVE, //sandbox or live
        client_id: process.env.PAYPAL_CLIENT_ID,
        client_secret: process.env.PAYPAL_CLIENT_SECRET
    });
}

router.get(`/`, async (req, res) => {res.render(`pm`)});

router.get(`/thankyou`, async (req, res) => {res.render(`success`)});

router.get('/cancel', (req, res) => res.send('Cancelled'));

router.post(`/`, async (req, res) => {
    if (!req.body.fromname || !req.body.prioritymessage) return res.json({ errors: `Please fill the required fields` });
    const payment = {
        intent: "sale",
        payer: {
            payment_method: "paypal"
        },
        redirect_urls: {
            return_url: `http://${process.env.APP_DOMAIN}/prioritymessage/success`,
            cancel_url: `http://${process.env.APP_DOMAIN}/prioritymessage/cancel`
        },
        transactions: [{
            item_list: {
                items: [{
                    name: "LightWarp Priority Message",
                    sku: "LWN-PM",
                    price: "3.00",
                    currency: "USD",
                    quantity: 1
                }]
            },
            amount: {
                currency: "USD",
                total: "3.00"
            },
            description: "LightWarpTV Priority Message"
        }]
    };
    paypal.payment.create(payment, (error, payment) => {
        if (error) {
            throw error;
        } else {
            transactions.push({
                id: payment.id,
                name: req.body.fromname,
                prioritymessage: req.body.prioritymessage,
                complete: false
            })
            log(`yellow`, `NEW PAYMENT INITIALIZED (ID: ${payment.id}) From: ${req.body.fromname}. With Message: ${req.body.prioritymessage}`)
            for(let i = 0;i < payment.links.length;i++){
                if(payment.links[i].rel === 'approval_url'){
                res.redirect(payment.links[i].href);
                }
            }
        }
    })
});

router.get(`/success`, async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const executePayment = {
        payer_id: payerId,
        transactions: [{
            amount: {
                currency: "USD",
                total: "3.00"
            }
        }]
    };
    paypal.payment.execute(paymentId, executePayment, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            const transactionData = transactions.find(transaction => transaction.id === payment.id)
            transactionData.complete = true;
            const embed = new Discord.MessageEmbed()
                .setTitle(transactionData.name)
                .setAuthor(`Priority Message`, `https://store.lightwarp.network/assets/img/logo.jpg`, `https://${process.env.APP_DOMAIN}/prioritymessage`)
                .setDescription(transactionData.prioritymessage)
            client.channels.cache.get(process.env.MESSAGE_CHANNEL_ID).send(embed);
            log(`green`, `Transaction "${transactionData.id}" Completed.`)
            transactions.splice(transactions.indexOf(transactionData), 1);
            res.redirect('/prioritymessage/thankyou');
        }
    });
})

client.login(process.env.DISCORD_TOKEN);

module.exports = router;