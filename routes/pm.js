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

router.post(`/btc`, async (req, res) => {
    if (!req.body.fromname || !req.body.prioritymessage || !req.body.fromemail) return res.json({ errors: `Please fill the required fields` });

    const id = crypto.randomBytes(64).toString(`hex`);

    const transaction = await coinpayments.createTransaction({
        currency1: `USD`,
        currency2: process.env.ENV === `prod` ? `BTC` : `LTCT`,
        amount: 3,
        buyer_email: req.body.fromemail,
        buyer_name: req.body.fromname,
        item_name: `LightWarp Priority Message`,
        custom: id,
        ipm_url: `${process.env.URL}/prioritymessage/success/btc`,
        success_url: `${process.env.URL}/prioritymessage/thankyou`,
        cancel_url: `${process.env.URL}/prioritymessage/cancel`,
    })

    const newTransaction = new Transaction({
        transactionID: id,
        name: req.body.fromname,
        arg: req.body.prioritymessage,
        price: `3`,
        type: `btc`
    })
    newTransaction.save(err => {
        if (err) return log(`red`, err)
        log(`yellow`, `Transaction ${id} saved to Database`)
        log(`yellow`, `NEW PAYMENT INITIALIZED (ID: ${id}) From: ${req.body.fromname}. With Message: ${req.body.prioritymessage}`)
        res.redirect(transaction.checkout_url);
    })


});

router.post(`/paypal`, async (req, res) => {
    if (!req.body.fromname || !req.body.prioritymessage) return res.json({ errors: `Please fill the required fields` });

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
            Transaction.findOne({ transactionID:  payment.id}).then(transaction => {
                if (transaction) return log(`red`, `Transaction already exists.`)
                const newTransaction = new Transaction({
                    transactionID: payment.id,
                    name: req.body.fromname,
                    arg: req.body.prioritymessage,
                    price: `3`,
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
});

router.get(`/success/paypal`, async (req, res) => {
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
            return res.send(`Error in Executing Transaction`);
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
                        .setAuthor(`Priority Message`, `https://lightwarp.network/assets/img/logo.jpg`, `https://${process.env.APP_DOMAIN}/prioritymessage`)
                        .setDescription(transaction.arg)
                    client.channels.cache.get(process.env.MESSAGE_CHANNEL_ID).send(embed);
                    socket(`prioritymessage`, transaction.name, transaction.arg);
                    res.redirect('/prioritymessage/thankyou');
                })
            })
        }
    });
})

router.get(`/success/btc`, async (req, res) => {
    let isValid, error;

    log(`red`, `INITIALIZED`)

    if (
        !req.get(`HMAC`) ||
        !req.body.ipn_mode ||
        req.body.ipn_mode !== `hmac` ||
        MERCHANT_ID !== req.body.merchant
    ) {
        return res.send(`Invalid request`);
    }

    try {
        isValid = verify(req.get(`HMAC`), process.env.IPN_SECRET, req.body);
    } catch (e) {
        error = e;
    }
  
    if (error && error) {
        return res.json({errors: error});
    }
  
    if (!isValid) {
        return res.send(`Hmac calculation does not match`);
    }

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
                .setAuthor(`Priority Message`, `https://lightwarp.network/assets/img/logo.jpg`, `https://${process.env.APP_DOMAIN}/prioritymessage`)
                .setDescription(transaction.arg)
            client.channels.cache.get(process.env.MESSAGE_CHANNEL_ID).send(embed);
            socket(`prioritymessage`, transaction.name, transaction.arg);
        })
    })
})

client.login(process.env.DISCORD_TOKEN);

module.exports = router;