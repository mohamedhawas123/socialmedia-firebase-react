

const functions = require('firebase-functions');

const {getAllScreems, postOnescreem, getScreem, commentOnScream, likeScream, unlikeScream, deleteSCream } = require('./handlers/screem')

const {signup, login, uploadImage, addUserDetails, getAuthenticat, getUserDetails, maketNotificationRead} = require('./handlers/users')

const app = require('express')()
const FBAuth = require('./utilty/fb');
const admin = require('firebase-admin');
const { firestore } = require('firebase-admin');


const cors = require('cors')
app.use(cors())

app.get('/screems', getAllScreems  )
app.post('/screem', FBAuth , postOnescreem)
app.get('/screem/:screemId', getScreem)
app.post('/scream/:screamId/comment', FBAuth, commentOnScream)
app.get('/scream/:screamId/like', FBAuth, likeScream)
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream)
app.delete('/scream/:screamId', FBAuth, deleteSCream)


app.post('/user/image', FBAuth ,uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth ,getAuthenticat)
app.post('/signup', signup)
app.post('/login', login)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBAuth ,maketNotificationRead)





exports.api = functions.https.onRequest(app)




exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return admin.firestore()
      .doc(`/screms/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return admin.firestore().doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });
exports.deleteNotificationOnUnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return admin.firestore()
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });
exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return admin.firestore()
      .doc(`/screms/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return admin.firestore().doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });


exports.onUserImageChange = functions.region('europe-west1').firestore.document('/user/{userId}')
.onUpdate((change) => {
  if(change.before.data().imageUrl !== change.after.data().imageUrl) {
    let batch = admin.firestore().batch();
  return admin.firestore().collection('screms').where('userHandle',  '==', change.before.data().handle).get()
  .then(data => {
    data.forEach(doc => {
      const scream = admin.firestore().doc(`/screms/${doc.id}`)
      batch.update(scream, {userImage: change.after.data().imageUrl})
    })
    return batch.commit();
  })
  }else return true

})



exports.onScreamDelete = functions.region('europe-west1').firestore.document('/screms/{sceamId}')
.onDelete((snapshot, context) => {
  const screamId= context.params.screamId
  
  const batch = admin.firestore().batch()
  return admin.firestore().collection('comments').where('screamId', '==', screamId).get()
  .then(data =>{
    data.forEach(doc => {
      batch.delete(admin.firestore().doc(`/comments/${doc.id}`));

    })
    return admin.firestore().collection('likes').where('screamId', '==', screamId).get()
  })
  .then(data => {
    data.forEach(doc => {
      batch.delete(admin.firestore().doc(`/likes/${doc.id}`))
    })
    return admin.firestore().collection('notifications').where('screamId', '==', screamId).get()
    
  })
  .then(data => {
    data.forEach(doc => {
      batch.delete(admin.firestore().doc(`/notifications/${doc.id}`))
    })
    return batch.commit()
  })
  .catch(err => {
    console.log(err)

  })

})





/*
exports.createNotificationOnlike = functions.firestore.document('likes/{id}')
.onCreate( (snapshot) => {
    return admin.firestore().doc(`/screms/${snapshot.data().screamId}`)
    .get()
    .then(doc => {
        if(doc.exists) {
            return admin.firestore().doc(`/notification/${snapshot.id}`).set({
                createdAt: new Date().toISOString,
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'like',
                read: false,
                sceamId: doc.id
            })
        }
    })
    .then( () => {
        return;
    } )
    .catch(err => {
        console.log(err)
        return
    })
} )

exports.deleteNotificationsOnUnlike = functions.firestore.document('likes/{id}').
onDelete(snapshop => {
    return admin.firestore().doc(`/notification/${snapshop.id}`)
    .delete()
    .then(() => {
        return;
    })
    .catch(err => {
        console.log(err)
        return;

    })
})

exports.createNotificationOncomment = functions.firestore.document('comments/{id}')
.onCreate( (snapshot) => {
    return admin.firestore().doc(`/screms/${snapshot.data().screamId}`)
    .get()
    .then(doc => {
        if(doc.exists) {
            return admin.firestore().doc(`/notification/${snapshot.id}`).set({
                createdAt: new Date().toISOString,
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'comment',
                read: false,
                sceamId: doc.id
            })
        }
    })
    .then( () => {
        return;
    } )
    .catch(err => {
        console.log(err)
        return
    })
} )

*/
