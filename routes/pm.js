const express = require(`express`);

var cors = require(`cors`)

const router = express.Router();

const paypal = require(`paypal-rest-sdk`);

const Discord = require(`discord.js`);
const gTTS = require(`gtts`);
const fs = require(`fs`);
const { Console } = require("console");
const client = new Discord.Client();

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

saytts(`Nigger`, `coontown`)
async function saytts(name, message) {
    client.on(`ready`, async () => {
        console.log(`Logged in to Discord as ${client.user.tag}!`);
        const channel = client.channels.cache.get(process.env.VOICE_CHANNEL)
        const connection = await channel.join();
        const gtts = new gTTS(`Priority Message from ${name} for 3 Dollars. ${message}`, 'en-us');
        gtts.save('output.mp3', function (err, result){
            if(err) { throw new Error(err); }
        });
        connection.play(fs.createReadStream(`output.mp3`), { volume: 0.5 })
        .on(`finish`, async () => {
            fs.unlinkSync(`output.mp3`)
        })
        console.log(`Test`)
    })
}


router.get(`/`, async (req, res) => {res.render(`pm`)});

router.get(`/thankyou`, async (req, res) => {res.render(`success`)});

router.get('/cancel', (req, res) => res.send('Cancelled'));

router.post(`/`, async (req, res) => {
    if (!req.body.fromname || !req.body.prioritymessage) return res.json({ errors: `Please fill the required fields` });
    console.log(req.body)
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
            console.log(`NEW PAYMENT INITIALIZED (ID: ${payment.id}) From: ${req.body.fromname}. With Message: ${req.body.prioritymessage}`)
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
            saytts(transactionData.name, transactionData.prioritymessage);
            console.log(`Transaction "${transactionData.id}" Completed.`)
            transactions.splice(transactions.indexOf(transactionData), 1);
            res.redirect('/prioritymessage/thankyou');
        }
    });
})

client.login(process.env.DISCORD_TOKEN);

module.exports = router;