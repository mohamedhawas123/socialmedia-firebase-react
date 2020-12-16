const { firestore } = require('firebase-admin');
const admin = require('firebase-admin')


exports.getAllScreems =  (req, res) => {
    admin.firestore().collection('screms').orderBy('createAt', 'desc').get()
    .then( data => {
      let screems = [];
      data.forEach(doc => {
        screems.push({
          screemId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createAt : doc.data().createAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage:doc.data().userImage
        })
      })
      return res.json(screems);
  
    })
    .catch(err => {
      console.error(err)
    })
  
  }


exports.postOnescreem = (req, res) => {


    const newScream = {
      body: req.body.body,
      userHandle: req.user.handle,
    //  createAt: admin.firestore.Timestamp.fromDate(new Date())
      userImage: req.user.imageUrl,
      createAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0

  
    }
    admin.firestore().collection('screms')
    .add(newScream)
    .then(doc => {
      const resScream = newScream
      resScream.screamId = doc.id;
      res.json(resScream)
    })
    .catch(err => {
      res.status(500).json({error: 'something went wrong'});
      console.log(err)
    })
  
  
  }


exports.getScreem = (req, res) => {
  let screamData = {};
  admin.firestore().doc(`/screms/${req.params.screemId}`).get()
  .then(doc => {
    if(!doc.exists) {
      return res.status(400).json({error: "Screm Not found"})
    }
    screamData = doc.data()
    screamData.screemId = doc.id;
    return admin.firestore().collection('comments').orderBy('createdAt', 'desc').where("screamid", '==', req.params.screemId).get()
  })
  .then(data => {
    screamData.comments = []
    data.forEach(doc => {
      screamData.comments.push(doc.data())
       
    })
    return res.json(screamData)
  })
  .catch(err => {
    console.log(err)
    return res.status(500).json({error: err.code})
  })

}


exports.commentOnScream = (req, res) => {
  if(req.body.body.trim() === '') return res.status(400).json({comment: 'comment must not be empty'})

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };

  admin.firestore().doc(`/screms/${req.params.screamId}`).get()
  .then(doc => {
    if(!doc.exists) {
      return res.status(404).json({error: 'Scream Not found'});

    }

   // return admin.firestore().collection('comments').add(newComment)
   return doc.ref.update({commentCount: doc.data().commentCount + 1});

  })
  .then ( () => {
    return admin.firestore().collection('comments').add(newComment) 
  } )
  .then( () => {
    res.json(newComment)
  } )
  .catch(err => {
    console.log(err)
    return res.status(500).json({error: 'something went wrong'})
  })
  

}


exports.likeScream = (req, res) => {

  const likeDocument = admin.firestore().collection('likes').where('userHandle', '==' ,req.user.handle)
  .where('screamId', '==', req.params.screamId).limit(1);

  const screamDocument = admin.firestore().doc(`/screms/${req.params.screamId}`);

  let screamData;
  screamDocument.get()
  .then(doc => {
    if(doc.exists) {
      screamData = doc.data();
      screamData.screamId = doc.id;
      return likeDocument.get() 

    }else {
      return res.status(404).json({error: 'Scream not found'})

    }
  })
  .then(data => {
    if(data.empty) {
      return admin.firestore().collection('likes').add({
        screamId: req.params.screamId,
        userHandle:req.user.handle
      })
      .then( () => {
        screamData.likeCount++
        return screamDocument.update({likeCount: screamData.likeCount})

      } )
      .then( () => {
        return res.json(screamData)
      } )
    } else {
      return res.status(400).json({error: 'scream already liked'})
    }
  })
  .catch(err => {
    res.status(500).json({error: err.code})
  })

}

exports.unlikeScream = (req, res) => {
  const likeDocument = admin.firestore().collection('likes').where('userHandle', '==' ,req.user.handle)
  .where('screamId', '==', req.params.screamId).limit(1);

  const screamDocument = admin.firestore().doc(`/screms/${req.params.screamId}`);

  let screamData;
  screamDocument.get()
  .then(doc => {
    if(doc.exists) {
      screamData = doc.data();
      screamData.screamId = doc.id;
      return likeDocument.get() 

    }else {
      return res.status(404).json({error: 'Scream not found'})

    }
  })
  .then(data => {
    if(data.empty) {
      return res.status(400).json({error: 'scream not liked'})
 
      
    } else {
      return admin.firestore().doc(`/likes/${data.docs[0].id}`).delete()
      .then(() => {
        screamData.likeCount--;
        return screamDocument.update({likeCount: screamData.likeCount})
      })
      .then( () => {
        res.json(screamData)
      } )
    
    }
  })
  .catch(err => {
    res.status(500).json({error: err.code})
  })
}


exports.deleteSCream = (req, res) => {
  const document = admin.firestore().doc(`/screms/${req.params.screamId}`);
  document.get()
  .then(doc => {
    if(!doc.exists) {
      return res.status(404).json({error: 'Scream Not found'});

    }
    if(doc.data().userHandle !== res.user.handle) {
      return res.status(404).json({error: 'You dont have the permissio to the fuck this'})

    }else {
      return document.delete()
    }
  })
  .then( () => {
    res.json({message: 'scream deleted successfuly'})
  } )
  .catch(err => {
    return res.status(500).json({error: err.code})

  })

}