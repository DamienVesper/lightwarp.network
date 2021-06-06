const express = require(`express`);

var cors = require(`cors`)

const router = express.Router();

const paypal = require(`paypal-rest-sdk`);

// Active Transactions
let transactions = [];

// Paypal Configuration.
paypal.configure({
    mode: 'sandbox', //sandbox or live
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
});

router.get(`/prioritymessage`, async (req, res) => {res.render(`pm`)});

router.get(`/prioritymessage/thankyou`, async (req, res) => {res.render(`success`)});

router.get('/prioritymessage/cancel', (req, res) => res.send('Cancelled'));

router.post(`/prioritymessage`, async (req, res) => {
    if (!req.body.fromname || !req.body.prioritymessage) return res.json({ errors: `Please fill the required fields` });
    console.log(req.body)
    const payment = {
        intent: "sale",
        payer: {
            payment_method: "paypal"
        },
        redirect_urls: {
            return_url: `https://${process.env.APP_DOMAIN}/prioritymessage/success`,
            cancel_url: `https://${process.env.APP_DOMAIN}/prioritymessage/cancel`
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
            console.log(payment)
            transactions.push({
                id: payment.id,
                name: req.body.fromname,
                prioritymessage: req.body.prioritymessage,
                complete: false
            })
            console.log(transactions)
            for(let i = 0;i < payment.links.length;i++){
                if(payment.links[i].rel === 'approval_url'){
                res.redirect(payment.links[i].href);
                }
            }
        }
    })
});

router.get(`/prioritymessage/success`, async (req, res) => {
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
            console.log(transactions);
            transactions.splice(transactions.indexOf(transactionData), 1);
            res.redirect('/prioritymessage/thankyou');
        }
    });
})

module.exports = router;