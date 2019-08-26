const admin = require("firebase-admin");

const functions = require("firebase-functions");

admin.initializeApp();

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
      return console.log("Read Events");
    })
    .catch(error => {
      console.log(error);
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
            return console.log(`Document Written with ID: ${docRef.id}`);
          })
          .catch(error => {
            response.send("Error, Could not write document");
            console.log("Error adding document: ", error);
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
            return console.log("Code verified!");
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
      console.log(error);
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
            return console.log(`Event Written with ID: ${docRef.id}`);
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
            return console.log("Code verified!");
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
