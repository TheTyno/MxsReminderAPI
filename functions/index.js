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
    name: data.name,
    email: data.email,
    verificationCode: code
  };

  console.log(data);

  response.set("Access-Control-Allow-Origin", "*");
  const db = admin.firestore();
  db.collection("temporalUsers")
    .add(user)
    .then(docRef => {
      response.send("Document Written!");
      return console.log(`Document Written with ID: ${docRef.id}`);
    })
    .catch(error => {
      response.send("Error, Could not write document");
      console.log("Error adding document: ", error);
    });
});
