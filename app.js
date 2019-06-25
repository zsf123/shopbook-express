var express = require('express');
var app = express();
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var routerRouter = require('./routes/router');
// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');
// 开放静态资源
app.use('/public/',express.static('./public/'));
app.use('/node_modules/', express.static('./node_modules/'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));


// 使用 session 中间件
app.set('trust proxy',1);
app.use(session({
    secret :  'secret', // 对session id 相关的cookie 进行签名
    resave : true,
	name:"sessionid",
	// rolling:true,
    saveUninitialized: false, // 是否保存未初始化的会话
    cookie : {
		// secure:true,
        maxAge : 1000 * 60 * 600 // 设置 session 的有效时间，单位毫秒,现在为1小时
    },
}));

// 配置解析表单 POST 请求体插件（注意：一定要在 app.use(router) 之前 ）
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
app.use(cookieParser());
//分发路由
app.use(routerRouter);
// app.use('/', indexRouter);
// app.use('/users', usersRouter);

module.exports = app;
