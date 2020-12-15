const {admin} = require('./admin')


module.exports  = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
      console.log('no token found')
      return res.status(403).json({error: 'unauthorized'})
    }
    
    admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      console.log(decodedToken)
      req.user = decodedToken;
      return admin.firestore().collection('users')
      .where('userId', '==', req.user.uid).limit(1).get()
    })
    .then(data => {
      console.log(data)
      req.user.imageUrl = data.docs[0].data().imageUrl
      req.user.handle = data.docs[0].data().handle
      return next();
  
    })
    .catch(err => {
      console.log(err)
      return res.status(403).json(err)
    })
  
  }