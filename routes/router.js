var express = require("express");
var router = express.Router();
var http = require('http');
var connection = require('../database/database'); //连接数据库,路劲改变了
var RandomString = require("../public/js/util"); //产生随机字符串
// ----------------------------------------------------------------------
// 创建链接
connection.connect();




//通用的Sql查询，更新，删除语句------------------------------------------------------------------------------------
function connectSelect(sql) {
	return new Promise(function(resolve) {
		connection.query(sql, function(err, result) {
			if (err) {
				console.log('[SELECT ERROR] - ', err.message);
				return;
			}
			resolve(result);
		});
	})
}

//创建通用插入语句
function connectInsert(sql, params) {
	connection.query(sql, params, function(err, result) {
		if (err) {
			console.log('[SELECT ERROR] - ', err.message);
			return;
		}
	});
}

// 用户登录
router.post("/user/login", (req, res) => {
	var params = req.body;
	var User = null; //最后登录成功的用户对象
	if (params.username != '' || params.username != null && params.password != '' || params.password != null) {
		var username = JSON.stringify(params.username);
		var password = JSON.stringify(params.password);
		//查询出所有用户信息
		var userInfoSql = 'SELECT * FROM users where users.username=' + username + "and users.password=" + password;
		connectSelect(userInfoSql).then(val => {
			// 这里查询出的json对象，且为对象数组，
			if (val) {
				// 生成随机的token
				var token = RandomString;
				// 将当前登录用户存入session中一份
				req.session.USER = val[0];
				req.session.sessionid = token;

				res.json({
					code: 200,
					user: val,
					msg: '登录成功',
					token: token
				})
			} else {
				res.json({
					code: 500,
					msg: '用户名或密码错误'
				})
			}
		})
	}
});
// 查询所有用户信息
router.get("/selectAllUser", (req, res) => {
	var pageSize = req.query.limit; //每页记录数
	var currentPage = req.query.page; //当前页
	var start = (currentPage - 1) * pageSize;
	var sql = "select * from users where del_flag=0 order by create_date limit " + start + "," + pageSize; //查询出所有用户信息
	console.log("sql:" + sql)
	var sqlcount = "select count(*) as count from users";
	connectSelect(sqlcount).then(count => {
		connectSelect(sql).then(val => {
			console.log("后台打印用户信息：" + val);
			res.json({
				code: 200,
				user: val,
				totalcount: count[0].count,
				msg: 'success'
			});
		})
	})
});

// 拉取用户信息
router.get('/user/info', (req, res) => {
	var token = req.query.token;
	// 判断前端token是否和服务端登录Token相同，如果相同，返回当前登录的用户数据
	// 拉取用户信息过程中，如果后端的session信息丢失，那么前端要重新登录重新获得token
	if (req.session.sessionid) {
		if (req.session.sessionid == token) {
			// sql语句会智能匹配
			var sql =
				'select name,description from role where role.id in(select role_id from  t_user_role where t_user_role.user_id=' +
				req.session.USER.id + ')'
			// 查询出当前用户的角色并返回
			connectSelect(sql).then(val => {
				res.json({
					user: req.session.USER,
					roles: val
				})
			});
		}
	} else {
		throw ("服务器错误！！！")
	}
});

// 用户退出登录
router.post('/user/logout', (req, res) => {
	res.json({
		path: '/login'
	});
});
// 根据id删除用户
router.post('/updateUserDelflag/id/:id', (req, res) => {
	var id = req.params.id;
	console.log("id:" + id);
	// var sql='delete from users where id='+id;
	var sql = "update users set del_flag=1 where id =" + id;
	connectSelect(sql).then(val => {
		res.json({
			code: 200,
			msg: "success"
		})
	})
})


// 查询所有角色信息
router.get("/selectAllRole", (req, res) => {
	var pageSize = req.query.limit; //每页记录数
	var currentPage = req.query.page; //当前页
	var start = (currentPage - 1) * pageSize;
	var sql = "select * from role where del_flag=0 order by add_date limit " + start + "," + pageSize; //查询出所有角色信息
	var sqlcount = "select count(*) as count from role";
	connectSelect(sqlcount).then(count => {
		connectSelect(sql).then(val => {
			res.json({
				code: 200,
				role: val,
				totalcount: count[0].count,
				msg: 'success'
			});
		})
	});
})



// 根据角色id查询用户角色中间表
router.get('/selectUserRole/id/:id', (req, res) => {
	var id = req.params.id;
	var sql = "select count(*) as count from t_user_role where role_id=" + id;
	connectSelect(sql).then(val => {
		console.log("个数为：" + JSON.stringify(val));
		res.json({
			code: 200,
			count: val[0].count,
			msg: 'success'
		});
	})
})

//该角色未关联用户， 修改角色删除标志
router.post('/updateRoleDelflag/id/:id', (req, res) => {
	var id = req.params.id;
	var sql = "update role set del_flag=1 where id=" + id;
	connectSelect(sql).then(val => {
		res.json({
			code: 200,
			msg: 'success'
		});
	})
})


// 查询出当前点击用户的角色
router.get('/selectRoleByUserId/id/:id', (req, res) => {
	var userid = req.params.id;
	var sql = "select * from role where id in (select role_id from t_user_role where user_id=" + userid + ")";
	connectSelect(sql).then(val => {
		res.json({
			code: 200,
			roles: val,
			msg: 'success'
		});
	})
})


// 保存用户信息
router.post('/saveUserinfo', (req, res) => {
	var user = req.body.user;
	var obj = JSON.parse(user);
	if (obj.status == true) {
		obj.status = 1;
	} else if (obj.status == false) {
		obj.status = 0
	}
	// 对前台传来的字符串数据进行校验,这里不用更新更改的时间，因为数据库创建的时候就设置了timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT
	var sql = "update users set username='" + obj.username + "',age=" + obj.age + ",sex='" + obj.sex + "',phone='" +
		obj
		.phone +
		"',email='" + obj.email + "',nickname='" + obj.nickname + "',status='" + obj.status + "',avatar_url='" + obj.avatar_url +
		"',qq='" + obj.qq + "',remark='" + obj.remark + "' where id=" + obj.id;
	console.log("sql为: " + sql)

	// 首先向用户角色表中删除当前用户的所有角色数据，
	var delsql = "delete from t_user_role where user_id=" + obj.id;
	connectSelect(delsql).then(val => {
		// 再重新插入数据
		var roles = obj.checkedRoles;
		for (var i = 0; i < roles.length; i++) {
			var selsql = "select id from role where description='" + roles[i] + "'";
			connectSelect(selsql).then(val => {
				var insertsql = "insert into t_user_role(user_id,role_id) values(" + obj.id + "," + val[0].id + ")";
				connectSelect(insertsql);
			})
		}
		// 再更新用户表中的数据
		connectSelect(sql).then(val => {
			res.json({
				code: 200,
				msg: '保存成功'
			});
		})
	})
})


// 查询所有书籍信息
router.get("/selectAllBook", (req, res) => {
	var pageSize = req.query.limit; //每页记录数
	var currentPage = req.query.page; //当前页
	var start = (currentPage - 1) * pageSize;
	var sql = "select * from books  limit " + start + "," + pageSize; //查询出所有用户信息
	console.log("sql:" + sql)
	var sqlcount = "select count(*) as count from books";
	connectSelect(sqlcount).then(count => {
		connectSelect(sql).then(val => {
			console.log("后台打印用户信息：" + val);
			res.json({
				code: 200,
				book: val,
				totalcount: count[0].count,
				msg: 'success'
			});
		})
	})
});




// 导出路由
module.exports = router
