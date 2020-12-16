const firebase = require('firebase');
const { firestore } = require('firebase-admin');
//const {config} = require('../utilty/config')
const admin = require('firebase-admin')

const config = {
    apiKey: "AIzaSyDICP348A6Recv7Iw7OyQGF6aOid6KPJJw",
    authDomain: "socialapp-78005.firebaseapp.com",
    databaseURL: "https://socialapp-78005.firebaseio.com",
    projectId: "socialapp-78005",
    storageBucket: "socialapp-78005.appspot.com",
    messagingSenderId: "251601144055",
    appId: "1:251601144055:web:c184aef431e77aaf1dabf2",
    measurementId: "G-SSGRNBT2K9"
}

firebase.initializeApp(config);


const {validateSignup, validateLoginDAta, reduceUserDetail} = require('../utilty/validators')

exports.signup = (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password, 
      confirmPassword: req.body.confirmPassword, 
      handle: req.body.handle, 
  
    }
    
    const {valid, errors} = validateSignup(newUser)

    if(!valid) return res.status(400).json(errors)
    
    const noImg = 'no-img.jpg'

    
    let token, userId;
  
  
    admin.firestore().doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if(doc.exists) {
        return res.status(400).json({handle: 'this handle is aleardy token'});
  
      }else {
  
        return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken()
    })
    .then(tokenid => {
      token = tokenid
  
      const userCred = {
        handle : newUser.handle,
        email: newUser.email,
        createAt : new Date().toISOString(),
        imageUrl : `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId
  
      };
      return admin.firestore().doc(`/users/${newUser.handle}`).set(userCred)    
    })
    .then( () => {
      return res.status(201).json({token})
    } )
  
    .catch(err => {
      console.log(err)
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({email: 'email is already in use'});
  
      }else {
        return res.status(500).json({general: 'somthing went wrong please try again'})
      }
    })
    
    
  
  }


exports.login = (req, res) => {
    const user= {
      email : req.body.email,
      password: req.body.password
    };


    const {valid, errors} = validateLoginDAta(user)

    if(!valid) return res.status(400).json(errors)
  
    
  
    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({'token is' :token})
    })
    .catch(err => {
      if(err.code == 'auth/wrong-password') {
        return res.status(403).json({general: 'Wrong Credien, try agian '})
      }else return res.status(500).json({error:err.code})
    })
  
  
  
  }

// User Detail

exports.addUserDetails = (req, res ) => {
  let userDetail = reduceUserDetail(req.body)

  admin.firestore().doc(`/users/${req.user.handle}`).update(userDetail)
  .then(() =>{
    return res.json({message: 'Details Added Successfuly'})
  })
  .catch(err => {
    return res.status(400).json({error: err.code})
  })

}

//get Own user Detail

exports.getAuthenticat = (req, res) => {

  let userData = {};
  admin.firestore().doc(`/users/${req.user.handle}`).get()
  .then(doc => {
    if(doc.exists) {
      userData.credentials = doc.data();
      return admin.firestore().collection('likes').where('userHandle', '==', req.user.handle).get() 

    }

  })
  .then(data => {
    userData.likes = [];
    
    data.forEach(doc => {
        userData.likes.push(doc.data());

    })
    return admin.firestore().collection('notifications').where('recipient', '==', req.user.handle)
    .orderBy('createdAt', 'desc').limit(10).get();
  })
  .then(data => {
    userData.notifications = []
    data.forEach(doc => {
      userData.notifications.push({
        recipient: doc.data().recipient,
        sender: doc.data().sender,
        createAt: doc.data().createAt,
        type: doc.data().type,
        read: doc.data().read,
        notificationId: doc.id
      })
    })
    return res.json(userData)
  })
  .catch(err => {
    console.log(err)
    return res.status(500).json({error: err.code})
  })

}

//upload Image

exports.uploadImage = (req, res) => {
  const Busbody = require('busboy')
  const path = require('path')
  const fs = require('fs')
  const os = require('os')

  const busboy= new Busbody({headers:req.headers})

  let imageFileName;
  let imageToBeUoloaded = {};


  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

    if(mimetype !== 'image/jpeg' && minetype !== 'image/png') {
      return res.status(400).json({error: 'Wrong file type'})
    }
 

    const imageExtension = filename.split('.')[filename.split('.').length - 1]
    imageFileName = `${Math.round(Math.random() * 10000000000)}.${imageExtension}`
    const filepath = path.join(os.tmpdir(), imageFileName)
    imageToBeUoloaded = {filepath, mimetype }
    file.pipe(fs.createWriteStream(filepath))

  } )
  busboy.on('finish', () => {
    admin.storage().bucket().upload(imageToBeUoloaded.filepath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUoloaded.mimetype
        }
      }
    })
    .then(() => {
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      return admin.firestore.doc(`/users/${req.user.handle}`).update({imageUrl})
    })
    .then( () => {
      return res.json({message: 'image uploaded'})
    })

    .catch(err => {
      return res.status(500).json({error: err.code})
    })
  })
  busboy.end(req.rawBody);
}


exports.getUserDetails = (req, res) => {
  let userData ={};
  admin.firestore().doc(`/users/${req.params.handle}`).get()
  .then(doc => {
    if(doc.exists) {
      userData.user =doc.data();
      return admin.firestore().collection('screms').where('userHandle', '==', req.params.handle)
      .orderBy('createdAt', 'desc').get()
    }else {
      return res.status(404).json({error: 'User Not Found'})
    }
  })
  .then(data => {
    userData.screams = [];
    data.forEach(doc => {
      userData.screams.push({
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        userImage: doc.data().userImage,
        likeCount: doc.data().likeCount,
        commentCount: doc.data().commentCount,
        screamId : doc.id
      })
    });
    return res.json(userData)
  })
  .catch(err => {
    console.log(err)
    res.status(500).json({error: err.code})
  })
}


exports.maketNotificationRead = (req, res) => {
  let batch = admin.firestore().batch()
  req.body.forEach(notificationId => {
    const notification = admin.firestore().doc(`/notifications/${notificationId}`);
    batch.update(notification, {read: true} )
  });
  batch.commit()
  .then( () => {
    return res.json({message: "notifcation marked read "})    
  })
  .catch(err => {
    console.log(err)
    return res.status(500).json({error: err.code})
  })

}