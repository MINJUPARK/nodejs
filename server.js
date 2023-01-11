const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/css', express.static(__dirname + '/css'));
app.use('/images', express.static(__dirname + '/images'));
app.use('/favicon.ico', express.static('images/favicon.svg'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
})

app.get('/write', function(req, res) {
    res.sendFile(__dirname + '/write.html');
})

app.set('view engine', 'ejs');

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');
app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

const MongoClient = require('mongodb').MongoClient;

let db;
MongoClient.connect('mongodb+srv://admin:minju0227@cluster0.hs7p749.mongodb.net/?retryWrites=true&w=majority', function(error, client) {
    if (error) return console.log(error);
    db = client.db('todoapp');

    app.listen(8080, function() {
        console.log('listening 8080');
    });

    app.post('/add', function(req, res) {
        res.send('전송완료'); 
        
        db.collection('counter').findOne({ name: '게시물갯수' }, function(error, result) {
            console.log(result.totalPost);
            let totalPostingCount = result.totalPost;
            
            db.collection('post').insertOne({ _id: totalPostingCount + 1, 할일: req.body.title, 날짜: req.body.date }, function(error, result) {
                console.log('저장완료');
                
                db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost : 1 } }, function(error, result) {
                    if (error) return console.log(error);
                });     
            });
        })
    })

    app.get('/list', function(req, res) {
        db.collection('post').find().toArray(function(error, result) {
            console.log(result);
            res.render('list.ejs', { postdata : result });
        });
    });

    app.delete('/delete', function(req, res) {
        console.log(req.body);
        req.body._id = parseInt(req.body._id);

        db.collection('post').deleteOne(req.body, function(error, result) {
            console.log('삭제완료');
        })
    })

    app.get('/detail/:id', function(req, res) {
        db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(error, result) {
            if (!result) return res.send('URL 경로가 잘못되었습니다.');

            console.log(result);
            res.render('detail.ejs', { postdata : result });
        })
    })

    app.get('/edit/:id', function(req, res) {
        db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(error, result) {
            console.log(result);
            if (!result) return res.send('URL 경로가 잘못되었습니다.');
            res.render('edit.ejs', { postdata : result });
        })
    })

    app.put('/edit', function(req, res) {
        db.collection('post').updateOne({ _id : parseInt(req.body.id) }, { $set: { 할일 : req.body.title, 날짜 : req.body.date } }, function(error, result) {
            console.log('수정완료!');
            res.redirect('/list');
        });
    });

    app.get('/login', function(req, res) {
        res.render('login.ejs');
    });

    app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
        res.redirect('/mypage');
    });

    passport.use(new localStrategy({
        usernameField: 'id',
        passwordField: 'pw',
        session: true,
        passReqToCallback: false
    }, function(입력한아이디, 입력한비번, done) {
        console.log(입력한아이디, 입력한비번);

        db.collection('login').findOne({ id : 입력한아이디 }, function(error, result) {
            if(error) { return done(error) }

            if(!result) { return done(null, false, { message: '존재하지 않는 아이디입니다.' }) };

            if(입력한비번 == result.pw) {
                return done(null, result);
            } else {
                return done(null, false, { message: '비밀번호가 일치하지 않습니다.' })
            }
        });
    }));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(아이디, done) {
        db.collection('login').findOne({ id: 아이디 }, function(error, result) {
            done(null, result);
        });
    });

    app.get('/mypage', loginFn, function(req, res) {
        console.log(req.user);
        res.render('mypage.ejs', { 사용자: req.user });
    })

    function loginFn(req, res, next) {
        if(req.user) {
            next();
        } else {
            res.send('로그인 상태가 아닙니다.');
        }
    }

    app.get('/search', function(req, res) {
        db.collection('post').find({ $text: {$search : req.query.value} } ).toArray((error, result) => {
            console.log(result);
            res.render('search.ejs', { postdata : result, search : req.query.value })
        })
    })
});