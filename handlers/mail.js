const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');     // for in-lining the css in the html mail
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

// create a transport
const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// test that mail sending works. Import this file into any file will trigger this method automatically and mail will be send
// FOR TESTING ONLY
// transport.sendMail({
//     from: 'Wes Bos <wesbos@gmail.com>',
//     to: 'randy@example.com',
//     subject: 'Just trying things out!',
//     html: 'Hey I <strong>love</strong> you',
//     text: 'Hey I **love you**'
// });

// since our emails to be sent are written in pug, we have to generate the html to be sent from the here
// NOTE THAT THIS METHOS IS STARTED AS CONST INSTEAD OF EXPORTS..., THIS IS BECAUSE WE WILL NOT BE NEEDING THIS METHOD 
// OUTSIDE OF THIS MAIL.JS FILE. HENCE NO POINT EXPORTING IT
const generateHTML = (filename, options = {}) => {
    const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);

    // make css in-lined html for better rendering across devices
    const inlined = juice(html);

    // console.log(html);
    // return html;

    // return the inlined html
    return inlined;
}

exports.send = async (options) => {     // expects an object (calle options) that contains user, subject, text, etc
    // lets generate the html first
    const html = generateHTML(options.filename, options);
    // get the text from the html
    const text = htmlToText.fromString(html);

    const mailOptions = {
        from: `Ufere Peace <noreply@uferepeace.com>`,
        to: options.user.email,
        subject: options.subject,
        html: html,     // we will now use the generated html here
        text            // we are using just 'text' since key and value are same name
    };

    // promisify our sendMail fxn since by default it works as a callback
    const sendMail = promisify(transport.sendMail, transport);
    return sendMail(mailOptions);
}