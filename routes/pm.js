const express = require(`express`);

var cors = require(`cors`)

const router = express.Router();

const paypal = require(`paypal-rest-sdk`);
const nodemailer = require(`nodemailer`);

// Nodemailer Configuration.
const transport = nodemailer.createTransport({
    host: `localhost`,
    port: 25,
    secure: false,
    auth: {
        user: process.env.SMTP_USERNAME,
        password: process.env.SMTP_TOKEN
    },
    tls: {
        rejectUnauthorized: false
    }
});

const mailOptions = {
    from: `LightWarp Priority Messages <prioritymessages@lightwarp.network>`,
    to: `godofinsanity2000@gmail.com`,
    subject: `Test`,
    text: `Test`
};

transport.sendMail(mailOptions, err => {
    if (err) {
        user.delete();
        return res.json({
            errors: `Error sending a verification email to the specified email address.`
        });
    }
});

// Paypal Configuration.
paypal.configure({
    mode: 'live', //sandbox or live
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
});

router.get(`/prioritymessage`, async (req, res) => {res.render(`prioritymessage`)});

router.get('/prioritymessage/cancel', (req, res) => res.send('Cancelled'));

router.post(`/prioritymessage`, async (req, res) => {
    res.set({
        "Access-Control-Allow-Headers" : "Origin, Content-Type, Accept, Authorization, X- Request-With",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    })
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
            console.log(JSON.stringify(payment));
            res.send('Success');
        }
    });
})

module.exports = router;