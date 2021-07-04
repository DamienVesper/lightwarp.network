const express = require(`express`);
const router = express.Router();
const paypal = require(`paypal-rest-sdk`);
const Discord = require(`discord.js`);
const client = new Discord.Client();
const Transaction = require(`../models/transaction.model.js`);
const log = require(`../utils/log.js`);
const socket = require(`../socket.js`)
const crypto = require('crypto');
const Coinpayments = require('coinpayments');
const { verify } = require('coinpayments-ipn');
const CoinpaymentsIPNError = require('coinpayments-ipn/lib/error');
const { read } = require('fs');
const { parse } = require('dotenv');

const coinpayments = new Coinpayments ({
    key: process.env.COINPAYMENTS_KEY,
    secret: process.env.COINPAYMENTS_SECRET,
    autoIpn: true
})

// Paypal Configuration.
if (process.env.ENV === `dev`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_SANDBOX,
        client_id: process.env.PAYPAL_CLIENT_ID_SANDBOX,
        client_secret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX
    });
} else if (process.env.ENV === `dev-test`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_SANDBOX,
        client_id: process.env.PAYPAL_CLIENT_ID_SANDBOX,
        client_secret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX
    });
} else if (process.env.ENV === `prod`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_LIVE,
        client_id: process.env.PAYPAL_CLIENT_ID,
        client_secret: process.env.PAYPAL_CLIENT_SECRET
    });
} else if (process.env.ENV === `daemon`) {
    paypal.configure({
        mode: process.env.PAYPAL_ENV_LIVE, 
        client_id: process.env.PAYPAL_CLIENT_ID,
        client_secret: process.env.PAYPAL_CLIENT_SECRET
    });
}

router.get(`/`, async (req, res) => { res.render(`pm`) });

router.get(`/thankyou`, async (req, res) => {res.render(`success`)});

router.get('/cancel', (req, res) => res.send('Cancelled'));

router.post(`/`, async (req, res) => {
    if (!req.body.fromname || !req.body.prioritymessage || !req.body.amount) return res.json({ errors: `Please fill the required fields` });
    const amount = parseInt(req.body.amount)
    if (isNaN(amount)) return res.json({ errors: `Amount must be Integer.` })
    if (amount < 4) return res.json({ errors: `Below minimum amount.` })
    if (req.body.currency === `paypal`) {
        const payment = {
            intent: "sale",
            payer: {
                payment_method: "paypal"
            },
            redirect_urls: {
                return_url: `${process.env.URL}/prioritymessage/success/paypal`,
                cancel_url: `${process.env.URL}/prioritymessage/cancel`
            },
            transactions: [{
                item_list: {
                    items: [{
                        name: "LightWarp Priority Message",
                        sku: "LWN-PM",
                        price: req.body.amount,
                        currency: "USD",
                        quantity: 1
                    }]
                },
                amount: {
                    currency: "USD",
                    total: req.body.amount
                },
                description: "LightWarpTV Priority Message"
            }]
        };
        paypal.payment.create(payment, (error, payment) => {
            if (error) {
                return console.log(error);
            } else {
                Transaction.findOne({ transactionID:  payment.id}).then(transaction => {
                    if (transaction) return log(`red`, `Transaction already exists.`)
                    const newTransaction = new Transaction({
                        transactionID: payment.id,
                        name: req.body.fromname,
                        arg: req.body.prioritymessage,
                        price: req.body.amount,
                        type: `paypal`
                    })
                    newTransaction.save(err => {
                        if (err) return log(`red`, err)
                        log(`yellow`, `Transaction ${payment.id} saved to Database`)
                        log(`yellow`, `NEW PAYMENT INITIALIZED (ID: ${payment.id}) From: ${req.body.fromname}. With Message: ${req.body.prioritymessage}`)
                        for(let i = 0;i < payment.links.length;i++){
                            if(payment.links[i].rel === 'approval_url'){
                                res.redirect(payment.links[i].href);
                            }
                        }
                    })
                })
            }
        })
    } else {
        if (!req.body.fromemail) return res.json({ errors: `Please fill the required fields` });
        const id = crypto.randomBytes(64).toString(`hex`);

        const transaction = await coinpayments.createTransaction({
            currency1: `USD`,
            currency2: process.env.ENV === `prod` ? req.body.currency.toUpperCase() : `LTCT`,
            amount: req.body.amount,
            buyer_email: req.body.fromemail,
            buyer_name: req.body.fromname,
            item_name: `LightWarp Priority Message`,
            custom: id,
            ipm_url: `https://lightwarp.network/prioritymessage/success/crypto`,
            success_url: `${process.env.URL}/prioritymessage/thankyou`,
            cancel_url: `${process.env.URL}/prioritymessage/cancel`,
        })

        const newTransaction = new Transaction({
            transactionID: id,
            name: req.body.fromname,
            arg: req.body.prioritymessage,
            price: req.body.amount,
            type: req.body.currency
        })
        newTransaction.save(err => {
            if (err) return log(`red`, err)
            log(`yellow`, `Transaction ${id} saved to Database`)
            log(`yellow`, `NEW PAYMENT INITIALIZED (ID: ${id}) From: ${req.body.fromname}. With Message: ${req.body.prioritymessage}`)
            res.redirect(transaction.checkout_url);
        })
    }
});

router.get(`/success/paypal`, async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    Transaction.findOne({
        transactionID: paymentId
    }).then(transaction => {

        const executePayment = {
            payer_id: payerId,
            transactions: [{
                amount: {
                    currency: "USD",
                    total: transaction.price.toString()
                }
            }]
        };
        paypal.payment.execute(paymentId, executePayment, function (error, payment) {
            if (error) {
                console.log(error.response);
                return res.send(`Error in Executing Transaction`);
            } else {
                    if (!transaction) return res.status(404).send(`Error: Transaction does not exist`)
                    if (transaction.paid == true) return res.send(`Transaction ${paymentId} is already Complete`)
                    transaction.paid = true;
                    transaction.save(() => {
                        log(`green`, `Transaction "${paymentId}" Completed.`)
                        const embed = new Discord.MessageEmbed()
                            .setTitle(transaction.name)
                            .setAuthor(`Priority Message for ${transaction.price} USD`, `https://lightwarp.network/assets/img/logo.jpg`, `https://${process.env.APP_DOMAIN}/prioritymessage`)
                            .setDescription(transaction.arg)
                        client.channels.cache.get(process.env.MESSAGE_CHANNEL_ID).send(embed);
                        socket(`prioritymessage`, transaction.name, transaction.arg, transaction.price);
                        res.redirect('/prioritymessage/thankyou');
                    })
            }
        });
    })

})

router.post(`/success/crypto`, async (req, res) => {
    let isValid, error;

    if (
        !req.get(`HMAC`) ||
        !req.body.ipn_mode ||
        req.body.ipn_mode !== `hmac`
    ) return res.send(`Invalid request`);

    try {
        isValid = verify(req.get(`HMAC`), process.env.IPN_SECRET, req.body);
    } catch (e) {
        error = e;
    }
  
    if (error && error) return res.json({errors: error});
    if (!isValid) return res.send(`Hmac calculation does not match`);

    if (req.body.status_text === `Complete`) {
        Transaction.findOne({
            transactionID: req.body.custom
        }).then(transaction => {
            if (!transaction) return res.status(404).send(`Error: Transaction does not exist`)
            if (transaction.paid == true) return res.send(`Transaction ${req.body.custom} is already Complete`)
            transaction.paid = true;
            transaction.save(() => {
                log(`green`, `Transaction "${req.body.custom}" Completed.`)
                const embed = new Discord.MessageEmbed()
                    .setTitle(transaction.name)
                    .setAuthor(`Priority Message for ${transaction.price} USD (CRYPTO)`, `https://lightwarp.network/assets/img/logo.jpg`, `https://${process.env.APP_DOMAIN}/prioritymessage`)
                    .setDescription(transaction.arg)
                client.channels.cache.get(process.env.MESSAGE_CHANNEL_ID).send(embed);
                socket(`prioritymessage`, transaction.name, transaction.arg, transaction.price);
            })
        })
    } else {
        res.send(`Incomplete`)
        log(`red`, `Incomplete`)
    }
})

client.login(process.env.DISCORD_TOKEN);

module.exports = router;