const express = require(`express`);
const router = express.Router();
const paypal = require(`paypal-rest-sdk`);
const Discord = require(`discord.js`);
const client = new Discord.Client();
const Transaction = require(`../models/transaction.js`);
const log = require(`../utils/log.js`);
const socket = require(`../socket.js`);

// Paypal Configuration.
if (process.env.ENV === `dev`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_SANDBOX, //sandbox or live
        client_id: process.env.PAYPAL_CLIENT_ID_SANDBOX,
        client_secret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX
    });
} else if (process.env.ENV === `dev-test`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_SANDBOX, //sandbox or live
        client_id: process.env.PAYPAL_CLIENT_ID_SANDBOX,
        client_secret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX
    });
} else if (process.env.ENV === `prod`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_LIVE, //sandbox or live
        client_id: process.env.PAYPAL_CLIENT_ID,
        client_secret: process.env.PAYPAL_CLIENT_SECRET
    });
} else if (process.env.ENV === `daemon`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_LIVE, //sandbox or live
        client_id: process.env.PAYPAL_CLIENT_ID,
        client_secret: process.env.PAYPAL_CLIENT_SECRET
    });
}

router.get(`/`, async (req, res) => {res.render(`media`)});

router.get(`/thankyou`, async (req, res) => {res.render(`success`)});

router.get('/cancel', (req, res) => res.send('Cancelled'));

router.post(`/`, async (req, res) => {
    if (!req.body.fromname || !req.body.mediashare) return res.json({ errors: `Please fill the required fields` });

    const payment = {
        intent: "sale",
        payer: {
            payment_method: "paypal"
        },
        redirect_urls: {
            return_url: `${process.env.URL}/mediashare/success`,
            cancel_url: `${process.env.URL}/mediashare/cancel`
        },
        transactions: [{
            item_list: {
                items: [{
                    name: "LightWarp Media Share",
                    sku: "LWN-PM",
                    price: "6.00",
                    currency: "USD",
                    quantity: 1
                }]
            },
            amount: {
                currency: "USD",
                total: "6.00"
            },
            description: "LightWarpTV Media Share"
        }]
    };
    paypal.payment.create(payment, (error, payment) => {
        if (error) {
            throw error;
        } else {
            Transaction.findOne({ transactionID:  payment.id}).then(transaction => {
                if (transaction) return log(`red`, `Transaction already exists.`)
                const newTransaction = new Transaction({
                    transactionID: payment.id,
                    name: req.body.fromname,
                    arg: req.body.mediashare,
                    price: `6`
                })
                newTransaction.save(err => {
                    if (err) return log(`red`, err)
                    log(`yellow`, `Transaction ${payment.id} saved to Database`)
                    log(`yellow`, `NEW PAYMENT INITIALIZED (ID: ${payment.id}) From: ${req.body.fromname}. With Message: ${req.body.mediashare}`)
                    for(let i = 0;i < payment.links.length;i++){
                        if(payment.links[i].rel === 'approval_url'){
                            res.redirect(payment.links[i].href);
                        }
                    }
                })
            })
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
                total: "6.00"
            }
        }]
    };
    paypal.payment.execute(paymentId, executePayment, function (error, payment) {
        if (error) {
            console.log(error.response);
            return res.send(`Error in Executing Transaction`)
        } else {
            Transaction.findOne({
                transactionID: paymentId
            }).then(transaction => {
                if (!transaction) return res.status(404).send(`Error: Transaction does not exist`)
                if (transaction.paid == true) return res.send(`Transaction ${paymentId} is already Complete`)
                transaction.paid = true;
                transaction.save(() => {
                    log(`green`, `Transaction "${paymentId}" Completed.`)
                    const embed = new Discord.MessageEmbed()
                        .setTitle(transaction.name)
                        .setAuthor(`Media Share`, `https://lightwarp.network/assets/img/logo.jpg`, `https://${process.env.APP_DOMAIN}/mediashare`)
                        .setDescription(transaction.arg)
                    if (!process.env.ENV === `dev`) {
                        client.channels.cache.get(process.env.MESSAGE_CHANNEL_ID).send(embed);
                    }
                    socket(`mediashare`, transaction.name, transaction.arg);
                    res.redirect('/mediashare/thankyou');
                })
            })
        }
    });
})

client.login(process.env.DISCORD_TOKEN);

module.exports = router;