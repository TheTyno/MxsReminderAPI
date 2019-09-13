const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const nodemailer = require("nodemailer");

async function emailSender(email, emailSubject, body) {
  const transporter = nodemailer.createTransport({
    host: "email-smtp.us-east-1.amazonaws.com",
    port: 465,
    secure: true,
    auth: {
      user: "AKIATUS43NWQNUS24FPK",
      pass: "BOqD/hhoAbRvR66xKlgmnXbcILmJeYo7cRMUB+QvQjDP"
    }
  });

  const mailOptions = {
    from: '"MxsReminder" <no-reply@mxsreminder.com>',
    bcc: email,
    subject: emailSubject,
    text: "Hello?",
    html: body
  };
  const response = await transporter.sendMail(mailOptions);

  return response.messageId;
}

async function eventReminder(event) {
  const emails = [];
  const eventSubject = `${event.type} today at ${event.hour}!`;
  const eventBody = `<div><p>Hello Mx Simulator Community! Today ${event.firstName +
    " " +
    event.lastName} will host
  an event. Details below.</p>
  <ul>
    <li><b>Event:</b> ${event.type}</li>
    <li><b>Hour:</b> ${event.hour}</li>
    <li><b>Server:</b> ${event.server}</li>
    <li><b>Track Name:</b> ${event.track}</li>
    <li><b>Track Link:</b> ${event.tracklink}</li>
    <li><b>Bikes allowed:</b> ${event.bikes}</li>
    <li><b>Description:</b> ${event.description}</li>
  </ul>
  </div>`;

  await admin
    .firestore()
    .collection("users")
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => emails.push(doc.id));
      return console.log("Emails saved in array.");
    })
    .catch(error => {
      return console.log("Error trying to save emails: ", error);
    });

  async function runloop() {
    let responses = [];
    for (const email of emails) {
      responses.push(
        emailSender(email, eventSubject, eventBody).catch(error =>
          console.log("Error trying to send email to ", email)
        )
      );
    }

    return await Promise.all(responses);
  }

  const status = await runloop();

  console.log("status", status);

  return status;
}

exports.readEvents = functions.https.onRequest((request, response) => {
  let eventsArray = [];
  response.set("Access-Control-Allow-Origin", "*");
  admin
    .firestore()
    .collection("events")
    .get()
    .then(snapshot => {
      snapshot.forEach(event => {
        eventsArray.push(event.data());
      });
      response.send(eventsArray);
      return console.log("Events sent");
    })
    .catch(error => {
      console.log("Error trying to send events: ", error);
      response.status(500).send(error);
    });
});

exports.createTempUser = functions.https.onRequest((request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  let code = "";

  for (let i = 0; i < 6; i++) {
    if (i < 3) {
      let randLetter = Math.floor(Math.random() * 25) + 97;
      code += String.fromCharCode(randLetter);
    } else {
      let randInt = Math.floor(Math.random() * 10);
      code += randInt;
    }
  }

  const data = JSON.parse(Object.keys(request.body)[0]);

  const user = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email
  };

  const verificationCodeBody = `<p> Hello ${user.firstName}. 
  Here is your verification code <b>${code}</b>. So hurry up!`;

  console.log(data);
  const docRef = admin
    .firestore()
    .collection("users")
    .doc(user.email);
  docRef
    .get()
    .then(doc => {
      if (doc.exists) {
        response.send("This email already exists");
      } else {
        admin
          .firestore()
          .collection("temporalUsers")
          .doc(code)
          .set(user)
          .then(docRef => {
            response.send("Document Written!");
            return emailSender(
              user.email,
              "Verification Code",
              verificationCodeBody
            ).catch(error =>
              console.log("Error trying to send verification email: ", error)
            );
          })
          .catch(error => {
            response.send("Error, Could not write temporal user");
            console.log("Error adding temporal user: ", error);
          });
      }
      return console.log(doc.data());
    })
    .catch(error => console.log(error));
});

exports.verifyCode = functions.https.onRequest((request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const data = JSON.parse(Object.keys(request.body)[0]);
  const code = data.code;
  const email = data.email;
  const user = { firstName: data.firstName, lastName: data.lastName };

  const verifyBody = `<div>
  <p>Hello <b>${user.firstName}</b>! Thanks for subscribing to MxsReminder! Now you will receive notifications about
   daily eliminations and fun races. You can go to <a href = 'https://mxsreminder.com'>mxsreminder.com</a> and schedule your own
    events as well.</p>
    <br/>
    <p>To unsubscribe and stop receiving this emails you can go to <a href = 'https://mxsreminder.com/unsubscribe'>mxsreminder.com/unsubscribe</a></p>
  </div>`;

  function deleteTemporalCode(code) {
    admin
      .firestore()
      .collection("temporalUsers")
      .doc(code)
      .delete()
      .then(function() {
        return console.log("Temporal user deleted");
      })
      .catch(error => console.log(error));
  }

  const docRef = admin
    .firestore()
    .collection("temporalUsers")
    .doc(code);
  docRef
    .get()
    .then(doc => {
      if (doc.exists) {
        admin
          .firestore()
          .collection("users")
          .doc(email)
          .set(user)
          .then(docRef => {
            response.send("Code verified!");
            deleteTemporalCode(code);
            return emailSender(
              email,
              "Welcome to MxsReminder!",
              verifyBody
            ).catch(error =>
              console.log("Error trying to send welcome email: ", error)
            );
          })
          .catch(error => console.log("Error trying to add user: ", error));
      } else {
        response.send("Invalid code!");
      }
      return console.log(doc.data());
    })
    .catch(error => {
      console.log("Something happened: ", error);
    });
});

exports.unsubscribe = functions.https.onRequest((request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const data = JSON.parse(Object.keys(request.body)[0]);
  const email = data.email;
  const docRef = admin
    .firestore()
    .collection("users")
    .doc(email);

  docRef
    .delete()
    .then(function() {
      return response.send("Email deleted");
    })
    .catch(error => {
      console.log("Error trying to unsubscribe", error);
      response.send("Something went wrong");
    });
});

exports.createTempEvent = functions.https.onRequest((request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  let code = "";

  for (let i = 0; i < 6; i++) {
    if (i < 3) {
      let randLetter = Math.floor(Math.random() * 25) + 97;
      code += String.fromCharCode(randLetter);
    } else {
      let randInt = Math.floor(Math.random() * 10);
      code += randInt;
    }
  }

  const data = JSON.parse(Object.keys(request.body)[0]);

  const event = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    server: data.server,
    track: data.track,
    tracklink: data.tracklink,
    hour: data.hour,
    timezone: data.timezone,
    type: data.type,
    bikes: data.bikes,
    description: data.description
  };

  const verificationCodeBody = `<p> Hello ${event.firstName}. Here is your verification code <b>${code}</b>. Thanks for supporting MxsReminder! <3`;

  console.log(data);
  const docRef = admin
    .firestore()
    .collection("events")
    .doc(event.email);
  docRef
    .get()
    .then(doc => {
      if (doc.exists) {
        response.send("You already have created an event today");
      } else {
        admin
          .firestore()
          .collection("temporalEvents")
          .doc(code)
          .set(event)
          .then(docRef => {
            response.send("Event Written!");
            return emailSender(
              event.email,
              "Verification Code",
              verificationCodeBody
            ).catch(error =>
              console.log("Error trying to send verification email: ", error)
            );
          })
          .catch(error => {
            response.send("Error, Could not write event");
            console.log("Error adding event: ", error);
          });
      }
      return console.log(doc.data());
    })
    .catch(error => console.log(error));
});

exports.verifyEvent = functions.https.onRequest((request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const data = JSON.parse(Object.keys(request.body)[0]);
  const code = data.code;
  const email = data.email;

  const event = {
    firstName: data.firstName,
    lastName: data.lastName,
    server: data.server,
    track: data.track,
    tracklink: data.tracklink,
    hour: data.hour,
    timezone: data.timezone,
    type: data.type,
    bikes: data.bikes,
    description: data.description
  };

  function deleteTemporalEvent(code) {
    admin
      .firestore()
      .collection("temporalEvents")
      .doc(code)
      .delete()
      .then(function() {
        return console.log("Temporal event deleted");
      })
      .catch(error => console.log(error));
  }

  const docRef = admin
    .firestore()
    .collection("temporalEvents")
    .doc(code);
  docRef
    .get()
    .then(doc => {
      if (doc.exists) {
        admin
          .firestore()
          .collection("events")
          .doc(email)
          .set(event)
          .then(docRef => {
            response.send("Code verified!");
            deleteTemporalEvent(code);
            const status = eventReminder(event);
            return console.log(status);
          })
          .catch(error => console.log(error));
      } else {
        response.send("Invalid code!");
      }
      return console.log(doc.data());
    })
    .catch(error => {
      console.log("Something happened: ", error);
    });
});

exports.deleteDailyEvents = functions.pubsub
  .schedule("0 0 * * *")
  .onRun(context => {
    admin
      .firestore()
      .collection("events")
      .listDocuments()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => doc.delete());
        return console.log("Events eliminated");
      })
      .catch(error => console.log("error eliminando events ", error));
  });
